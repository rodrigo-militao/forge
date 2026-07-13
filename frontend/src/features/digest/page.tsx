import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Eye, EyeOff, Globe, Mail, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, type NewsletterEdition } from "../../api/client";
import { useJobPolling } from "../../hooks/useJobPolling";

/* ───── helpers ───── */

function relativeTime(dateStr: string, t: (key: string, opts?: object) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("digest.justNow");
  if (mins < 60) return t("digest.minutesAgo", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("digest.hoursAgo", { n: hours });
  return t("digest.daysAgo", { n: Math.floor(hours / 24) });
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/* ───── processing step labels ───── */

const PROCESSING_STEPS = [
  { key: "connected", duration: 3000 },
  { key: "discovering", duration: 8000 },
  { key: "categorizing", duration: 8000 },
] as const;

/* ───── component ───── */

export function DigestPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showUsedInEdition, setShowUsedInEdition] = useState(false);

  // Delete confirmation
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteConfirmRef = useRef<HTMLDivElement>(null);

  // Processing step delight
  const [processingStep, setProcessingStep] = useState(0);

  // Newsletter selector state
  const [newsletterOpen, setNewsletterOpen] = useState<string | null>(null);
  const [draftNewsletters, setDraftNewsletters] = useState<NewsletterEdition[]>([]);
  const [creatingNewsletter, setCreatingNewsletter] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
  });

  const { data: usedIDs } = useQuery({
    queryKey: ["article-newsletter-ids"],
    queryFn: api.digest.articleNewsletterIDs,
  });

  const usedSet = new Set(usedIDs ?? []);
  const items =
    content?.filter(
      (c) =>
        c.product === "digest" &&
        c.deleted_at === null &&
        (showUsedInEdition || !usedSet.has(c.id)),
    ) ?? [];

  const categories = [...new Set(items.map((c) => c.category).filter(Boolean) as string[])];
  const filteredItems = categoryFilter
    ? items.filter((c) => c.category === categoryFilter)
    : items;

  useJobPolling(running, items.length, {
    interval: 5000,
    filter: (c) => c.product === "digest",
    onComplete: (newItems) => {
      setRunning(false);
      setProcessingStep(3); // Complete!
      toast.success(t("digest.articleCount", { count: newItems.length, defaultValue: `${newItems.length} new articles` }));
    },
    onTimeout: () => {
      setRunning(false);
      setProcessingStep(3);
      toast(t("digest.articleCount", { count: 0, defaultValue: "Check for new articles" }));
    },
  });

  // Processing step progression
  useEffect(() => {
    if (!running) return;
    setProcessingStep(0);
    let stepIndex = 0;
    const tick = () => {
      stepIndex++;
      if (stepIndex < PROCESSING_STEPS.length) {
        setProcessingStep(stepIndex);
      }
    };
    const intervals: ReturnType<typeof setTimeout>[] = [];
    let accum = 0;
    for (const step of PROCESSING_STEPS) {
      accum += step.duration;
      intervals.push(setTimeout(tick, accum));
    }
    return () => intervals.forEach(clearTimeout);
  }, [running]);

  // Close delete confirmation on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (deleteConfirmRef.current && !deleteConfirmRef.current.contains(e.target as Node)) {
        setConfirmingDelete(null);
      }
    }
    if (confirmingDelete) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [confirmingDelete]);

  // Close newsletter selector on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setNewsletterOpen(null);
      }
    }
    if (newsletterOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [newsletterOpen]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setProcessingStep(0);
    try {
      await api.digest.run();
      // No toast here — the completion toast is handled by the poll
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("digest.runFailed"));
      setRunning(false);
    }
  }, [t]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Open newsletter selector for an article or batch
  const openNewsletterSelector = useCallback(async (target: string) => {
    try {
      const editions = await api.newsletters.list({ status: "draft" });
      setDraftNewsletters(editions);
    } catch {
      setDraftNewsletters([]);
    }
    setNewsletterOpen(target);
  }, []);

  const addToNewsletter = useCallback(
    async (newsletterID: string, articleID: string) => {
      try {
        await api.newsletters.addArticle(newsletterID, articleID);
        queryClient.invalidateQueries({ queryKey: ["article-newsletter-ids"] });
        toast.success(t("editor.saved"));
        setNewsletterOpen(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
    },
    [queryClient, t],
  );

  const createAndAddToNewsletter = useCallback(
    async (articleID: string) => {
      setCreatingNewsletter(true);
      try {
        const edition = await api.newsletters.create({ title: "New newsletter" });
        await api.newsletters.addArticle(edition.id, articleID);
        queryClient.invalidateQueries({ queryKey: ["article-newsletter-ids"] });
        queryClient.invalidateQueries({ queryKey: ["editions"] });
        toast.success(t("digest.newsletterCreated"));
        setNewsletterOpen(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
      setCreatingNewsletter(false);
    },
    [queryClient, t],
  );

  /** Show the inline delete confirmation popover */
  const requestDelete = useCallback((id: string) => {
    setConfirmingDelete(id);
  }, []);

  /** Execute delete after confirmation */
  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setConfirmingDelete(null);
      try {
        await api.content.delete(id);
        queryClient.invalidateQueries({ queryKey: ["content"] });
        setSelectedIDs((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success(t("digest.deleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
      setDeletingId(null);
    },
    [queryClient, t],
  );

  // Batch add to newsletter
  const handleBatchAddToNewsletter = useCallback(
    async (newsletterID: string) => {
      const ids = Array.from(selectedIDs);
      try {
        for (const id of ids) {
          await api.newsletters.addArticle(newsletterID, id);
        }
        queryClient.invalidateQueries({ queryKey: ["article-newsletter-ids"] });
        toast.success(t("digest.batchAdded", { count: ids.length }));
        setNewsletterOpen(null);
        setSelectedIDs(new Set());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
    },
    [selectedIDs, queryClient, t],
  );

  const usedCount = items.filter((c) => usedSet.has(c.id)).length;

  // Processing step label
  const stepLabel =
    processingStep < PROCESSING_STEPS.length
      ? t(`digest.${PROCESSING_STEPS[processingStep].key}`)
      : t("digest.complete");

  /* ───── loading skeleton ───── */

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="skeleton skeleton-title" />
          <div className="flex gap-2">
            <div className="skeleton skeleton-card !mb-0 !h-9 w-20 rounded-lg" />
            <div className="skeleton skeleton-card !mb-0 !h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <div className="skeleton skeleton-text !w-16 rounded-full" />
          <div className="skeleton skeleton-text !w-20 rounded-full" />
          <div className="skeleton skeleton-text !w-14 rounded-full" />
        </div>
        <div className="mt-5 space-y-3">
          <div className="skeleton skeleton-card rounded-lg" />
          <div className="skeleton skeleton-card rounded-lg" />
          <div className="skeleton skeleton-card rounded-lg" />
        </div>
      </div>
    );
  }

  /* ───── render ───── */

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-[var(--font-display)] text-2xl">
          {t("digest.title")}
          {items.length > 0 && (
            <span className="ml-2 align-baseline font-[var(--font-body)] text-base font-normal text-[var(--color-text-muted)]">
              {t("digest.articleCount", { count: items.length })}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["content"] })}
            className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 p-2 text-[var(--color-text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-white/5 hover:text-[var(--color-bg-surface)]"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all duration-[var(--duration-fast)] hover:opacity-90 active:translate-y-px disabled:opacity-50"
          >
            <Sparkles size={16} className={running ? "animate-pulse" : ""} />
            {running ? t("digest.running") : t("digest.run")}
          </button>
          {selectedIDs.size > 0 && (
            <div className="relative">
              <button
                onClick={() => openNewsletterSelector("batch")}
                className="cursor-pointer flex items-center gap-2 rounded-lg border border-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/10"
              >
                <Mail size={16} />
                {t("digest.addToNewsletter", { count: selectedIDs.size })}
              </button>
              {newsletterOpen === "batch" && (
                <NewsletterSelector
                  ref={selectorRef}
                  newsletters={draftNewsletters}
                  creating={creatingNewsletter}
                  onSelect={(id) => handleBatchAddToNewsletter(id)}
                  onCreateNew={() => {
                    const firstID = Array.from(selectedIDs)[0];
                    if (firstID) createAndAddToNewsletter(firstID);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategoryFilter("")}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-[var(--duration-fast)] ${
              !categoryFilter
                ? "bg-[var(--color-accent-primary)] text-white"
                : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-[var(--duration-fast)] ${
                categoryFilter === cat
                  ? "bg-[var(--color-accent-primary)] text-white"
                  : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <span className="h-4 w-px bg-white/10" />
        <button
          onClick={() => setShowUsedInEdition((prev) => !prev)}
          className={`cursor-pointer flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-[var(--duration-fast)] ${
            showUsedInEdition
              ? "bg-white/10 text-[var(--color-bg-surface)]"
              : "bg-white/[0.06] text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          }`}
        >
          {showUsedInEdition ? <Eye size={14} /> : <EyeOff size={14} />}
          {t("digest.showUsedInEdition")}
          {usedCount > 0 && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs">{usedCount}</span>
          )}
        </button>
      </div>

      {/* Content list */}
      <div className="mt-5 space-y-3">
        {filteredItems.length === 0 && !running && (
          /* ── Empty / no-results state ── */
          <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
            {items.length > 0 ? (
              /* Filters active but no matches */
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <EyeOff size={24} className="text-[var(--color-text-muted)]" />
                </div>
                <h2 className="font-[var(--font-display)] text-xl text-[var(--color-bg-surface)]">
                  {t("digest.noResults")}
                </h2>
                <button
                  onClick={() => setCategoryFilter("")}
                  className="mt-4 cursor-pointer text-sm text-[var(--color-accent-primary)] transition-colors hover:underline"
                >
                  {t("digest.clearFilters")}
                </button>
              </>
            ) : (
              /* Truly empty — no content at all */
              <>
                <svg
                  width="128"
                  height="96"
                  viewBox="0 0 128 96"
                  fill="none"
                  className="mb-6 text-[var(--color-accent-primary)]"
                  aria-hidden="true"
                >
                  <rect x="8" y="32" width="112" height="32" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.15" />
                  <circle cx="28" cy="48" r="3" fill="currentColor" opacity="0.3" />
                  <circle cx="44" cy="48" r="3" fill="currentColor" opacity="0.5" />
                  <circle cx="60" cy="48" r="3" fill="currentColor" opacity="0.7" />
                  <circle cx="100" cy="48" r="8" fill="currentColor" />
                  <circle cx="100" cy="48" r="3" fill="var(--color-bg-base)" />
                  <path d="M72 28 Q90 20 100 40" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" />
                  <path d="M72 68 Q90 76 100 56" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" />
                </svg>
                <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-bg-surface)]">
                  {t("digest.emptyTitle")}
                </h2>
                <p className="mt-2 max-w-md text-center text-sm text-[var(--color-text-secondary)]">
                  {t("digest.emptyDesc")}
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <button
                    onClick={handleRun}
                    className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-all duration-[var(--duration-fast)] hover:opacity-90 active:translate-y-px"
                  >
                    <Sparkles size={16} />
                    {t("digest.run")}
                  </button>
                  <button
                    onClick={() => window.location.href = "/settings"}
                    className="cursor-pointer text-sm text-[var(--color-text-muted)] underline-offset-2 transition-colors hover:text-[var(--color-bg-surface)] hover:underline"
                  >
                    {t("digest.configureSources")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Running state (no items yet) */}
        {running && filteredItems.length === 0 && (
          <ProcessingState step={stepLabel} isComplete={processingStep >= PROCESSING_STEPS.length} />
        )}

        {/* Card list */}
        {filteredItems.map((item, idx) => {
          const isUsed = usedSet.has(item.id);
          const sourceUrl = item.metadata?.source_url as string | undefined;
          const domain = sourceUrl ? extractDomain(sourceUrl) : null;
          const isConfirmingDelete = confirmingDelete === item.id;
          const isDeleting = deletingId === item.id;

          return (
            <div
              key={item.id}
              style={!isUsed ? { animationDelay: `${idx * 50}ms` } : undefined}
              className={`group rounded-lg border border-[var(--color-border)]/20 p-3.5 transition-all duration-200 ${
                isUsed
                  ? "bg-white/[0.03] opacity-60"
                  : "animate-[fadeIn_400ms_ease-out_forwards] bg-white/5 opacity-0"
              } ${
                selectedIDs.has(item.id) ? "ring-1 ring-[var(--color-accent-primary)]" : ""
              } ${
                !isUsed ? "hover:-translate-y-0.5 hover:bg-white/[0.08] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] cursor-pointer" : ""
              }`}
              onClick={() => !isUsed && toggleSelected(item.id)}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Selection circle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelected(item.id); }}
                  className={`mt-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-150 ${
                    selectedIDs.has(item.id)
                      ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]"
                      : "border-white/15 bg-transparent hover:border-white/30"
                  }`}
                  aria-label={selectedIDs.has(item.id) ? "Deselect" : "Select"}
                >
                  {selectedIDs.has(item.id) && (
                    <Check size={14} className="text-white" />
                  )}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">
                      {(item.metadata as { source_url?: string })?.source_url ? (
                        <a
                          href={(item.metadata as { source_url?: string }).source_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer text-[var(--color-bg-surface)] transition-colors hover:text-[var(--color-accent-primary)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.title || "(no title)"}
                        </a>
                      ) : (
                        <span className="text-[var(--color-bg-surface)]">
                          {item.title || "(no title)"}
                        </span>
                      )}
                    </h3>
                    {isUsed && (
                      <span className="shrink-0 rounded bg-[var(--color-accent-success)]/20 px-1.5 py-0.5 text-xs text-[var(--color-accent-success)]">
                        Used
                      </span>
                    )}
                  </div>

                  {/* Source + timestamp metadata row */}
                  {(domain || item.created_at) && (
                    <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      {domain && (
                        <span className="inline-flex items-center gap-1">
                          <Globe size={10} />
                          {t("digest.fromSource", { source: domain })}
                        </span>
                      )}
                      {item.created_at && (
                        <span>{relativeTime(item.created_at, t)}</span>
                      )}
                    </div>
                  )}

                  {/* Body preview */}
                  {item.body_markdown && (
                    <p className="mt-1.5 line-clamp-3 text-sm text-[var(--color-text-secondary)] [overflow-wrap:break-word]">
                      {item.body_markdown}
                    </p>
                  )}

                  {/* Category (read-only, set by AI) */}
                  {item.category && (
                    <span className="mt-2 inline-block rounded-full bg-[var(--color-accent-primary)]/20 px-3 py-1 text-xs font-medium text-[var(--color-accent-primary)]">
                      {item.category}
                    </span>
                  )}
                </div>

                {/* Action column */}
                <div className="flex shrink-0 flex-col items-center gap-2">
                  {/* Delete button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isConfirmingDelete) {
                          handleDelete(item.id);
                        } else {
                          requestDelete(item.id);
                        }
                      }}
                      disabled={isDeleting}
                      className={`cursor-pointer rounded-lg p-2 transition-colors duration-[var(--duration-fast)] ${
                        isConfirmingDelete
                          ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-accent-danger)]/20 hover:text-[var(--color-accent-danger)]"
                      }`}
                      title={t("digest.delete")}
                    >
                      {isDeleting ? (
                        <span className="block h-4 w-4 animate-pulse rounded-full border border-[var(--color-accent-danger)] border-t-transparent" />
                      ) : (
                        <Trash2 size={16} />
                    )}
                    </button>
                    {isConfirmingDelete && (
                      <div
                        ref={deleteConfirmRef}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-10 z-50 animate-[scaleIn_150ms_ease-out_forwards] origin-top-right"
                      >
                        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-accent-danger)]/30 bg-[var(--color-bg-base)] px-3 py-2 shadow-lg">
                          <span className="whitespace-nowrap text-xs text-[var(--color-bg-surface)]">
                            {t("digest.deleteConfirm")}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            disabled={isDeleting}
                            className="cursor-pointer rounded-md bg-[var(--color-accent-danger)] px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {t("digest.deleteConfirmAction")}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingDelete(null);
                            }}
                            className="cursor-pointer rounded-md bg-white/10 px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/20 hover:text-[var(--color-bg-surface)]"
                          >
                            {t("digest.deleteCancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Newsletter button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openNewsletterSelector(item.id);
                      }}
                      className="cursor-pointer rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-primary)]/20 hover:text-[var(--color-accent-primary)]"
                      title="+ Newsletter"
                    >
                      <Mail size={16} />
                    </button>
                    {newsletterOpen === item.id && (
                      <NewsletterSelector
                        ref={selectorRef}
                        newsletters={draftNewsletters}
                        creating={creatingNewsletter}
                        onSelect={(id) => addToNewsletter(id, item.id)}
                        onCreateNew={() => createAndAddToNewsletter(item.id)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───── Processing state (inline component for readability) ───── */

function ProcessingState({ step, isComplete }: { step: string; isComplete: boolean }) {
  return (
    <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
      <div className="mb-6 flex items-center gap-1.5">
        {isComplete ? (
          /* Completion checkmark */
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[var(--color-accent-success)]">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path
              d="M10 16l4 4 8-8"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="24"
              strokeDashoffset="0"
              style={{ animation: "checkDraw 400ms var(--easing-enter) forwards" }}
            />
          </svg>
        ) : (
          <>
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite] [animation-delay:200ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite] [animation-delay:400ms]" />
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${isComplete ? "text-[var(--color-accent-success)]" : "text-[var(--color-accent-primary)]"}`}>
          {step}
        </span>
      </div>
    </div>
  );
}

/* ───── Newsletter selector dropdown ───── */
import { forwardRef } from "react";

const NewsletterSelector = forwardRef<HTMLDivElement, {
  newsletters: NewsletterEdition[];
  creating: boolean;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}>(({ newsletters, creating, onSelect, onCreateNew }, ref) => (
  <div
    ref={ref}
    className="absolute right-0 top-10 z-50 w-56 animate-[scaleIn_150ms_ease-out_forwards] origin-top-right rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-surface-elevated)] p-2 shadow-xl"
  >
    <p className="px-2 py-1 text-xs font-medium text-[var(--color-text-muted)]">
      Add to newsletter
    </p>
    {newsletters.length === 0 && (
      <p className="px-2 py-2 text-xs text-[var(--color-text-muted)]">
        No draft newsletters
      </p>
    )}
    {newsletters.map((nl) => (
      <button
        key={nl.id}
        onClick={() => onSelect(nl.id)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-bg-surface)] transition-colors hover:bg-white/10"
      >
        <Mail size={14} className="shrink-0 text-[var(--color-accent-primary)]" />
        <span className="truncate">{nl.title || "(no title)"}</span>
      </button>
    ))}
    <div className="mt-1 border-t border-[var(--color-border)]/10 pt-1">
      <button
        onClick={onCreateNew}
        disabled={creating}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/10 disabled:opacity-50"
      >
        <Plus size={14} />
        {creating ? "Creating…" : "Create new newsletter"}
      </button>
    </div>
  </div>
));

NewsletterSelector.displayName = "NewsletterSelector";
