import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, EyeOff, Mail, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, type ContentItem, type NewsletterEdition } from "../../api/client";
import { useJobPolling } from "../../hooks/useJobPolling";
import { StatsBar } from "./components/stats-bar";
import { FilterTabs, type FilterTab } from "./components/filter-tabs";
import { ArticleCard } from "./components/article-card";
import { DetailPanel } from "./components/detail-panel";

/* ───── processing step labels ───── */

const PROCESSING_STEPS = [
  { key: "connected", duration: 3000 },
  { key: "discovering", duration: 8000 },
  { key: "categorizing", duration: 8000 },
] as const;

/* ───── sort helpers ───── */

type SortKey = "newest" | "oldest" | "title";

function sortArticles(items: ContentItem[], sort: SortKey) {
  return [...items].sort((a, b) => {
    if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

/* ───── component ───── */

export function DigestPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selectedArticle, setSelectedArticle] = useState<ContentItem | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Processing step delight
  const [processingStep, setProcessingStep] = useState(0);

  // Newsletter selector state
  const [newsletterAnchor, setNewsletterAnchor] = useState<{
    articleId: string;
    top: number;
    right: number;
  } | null>(null);
  const newsletterOpen = newsletterAnchor?.articleId ?? null;
  const [draftNewsletters, setDraftNewsletters] = useState<NewsletterEdition[]>([]);
  const [creatingNewsletter, setCreatingNewsletter] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const { data: content, isLoading, isError } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
  });

  const { data: usedIDs } = useQuery({
    queryKey: ["article-newsletter-ids"],
    queryFn: api.digest.articleNewsletterIDs,
  });

  const { data: stats } = useQuery({
    queryKey: ["digest", "stats"],
    queryFn: api.digest.stats,
  });

  const usedSet = new Set(usedIDs ?? []);

  // All non-deleted digest items
  const digestItems = (content ?? []).filter(
    (c) => c.product === "digest" && c.deleted_at === null,
  );

  // Tab-based filtering
  const filteredByTab = (() => {
    switch (activeTab) {
      case "todos":
        return digestItems;
      case "novos":
        return digestItems.filter((c) => !usedSet.has(c.id));
      case "selecionados":
        return digestItems.filter((c) => selectedIDs.has(c.id));
      case "enviados":
        return digestItems.filter((c) => usedSet.has(c.id));
      default:
        return digestItems;
    }
  })();

  const sortedItems = sortArticles(filteredByTab, sortBy);

  // Tab counts
  const tabCounts = {
    todos: digestItems.length,
    novos: digestItems.filter((c) => !usedSet.has(c.id)).length,
    selecionados: selectedIDs.size,
    enviados: [...usedSet].filter((id) => digestItems.some((c) => c.id === id)).length,
  };

  useJobPolling(running, digestItems.length, {
    interval: 5000,
    filter: (c) => c.product === "digest",
    onComplete: (newItems) => {
      setRunning(false);
      setProcessingStep(3);
      queryClient.invalidateQueries({ queryKey: ["digest", "stats"] });
      toast.success(t("digest.articleCount", { count: newItems.length }));
    },
    onTimeout: () => {
      setRunning(false);
      setProcessingStep(3);
      queryClient.invalidateQueries({ queryKey: ["digest", "stats"] });
      toast(t("digest.articleCount", { count: 0 }));
    },
  });

  // Invalidate stats when content changes
  useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === "content" && event.type === "updated") {
        queryClient.invalidateQueries({ queryKey: ["digest", "stats"] });
      }
    });
    return () => unsub();
  }, [queryClient]);

  // Processing step progression
  useEffect(() => {
    if (!running) return;
    setProcessingStep(0);
    let stepIndex = 0;
    const intervals: ReturnType<typeof setTimeout>[] = [];
    let accum = 0;
    for (const step of PROCESSING_STEPS) {
      accum += step.duration;
      intervals.push(setTimeout(() => {
        stepIndex++;
        if (stepIndex < PROCESSING_STEPS.length) {
          setProcessingStep(stepIndex);
        }
      }, accum));
    }
    return () => intervals.forEach(clearTimeout);
  }, [running]);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    if (showSortDropdown) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showSortDropdown]);

  // Close detail panel on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedArticle(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Close newsletter selector on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setNewsletterAnchor(null);
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

  const handleCardClick = useCallback((id: string) => {
    const item = digestItems.find((c) => c.id === id);
    if (item) setSelectedArticle(item);
  }, [digestItems]);

  const openNewsletterSelector = useCallback(async (target: string, e?: React.MouseEvent) => {
    const btnRect = (e?.currentTarget as HTMLElement)?.getBoundingClientRect();
    try {
      const editions = await api.newsletters.list({ status: "draft" });
      setDraftNewsletters(editions);
    } catch {
      setDraftNewsletters([]);
    }
    setNewsletterAnchor(btnRect ? {
      articleId: target,
      top: btnRect.bottom + 6,
      right: window.innerWidth - btnRect.right,
    } : null);
  }, []);

  const addToNewsletter = useCallback(
    async (newsletterID: string, articleID: string) => {
      try {
        await api.newsletters.addArticle(newsletterID, articleID);
        queryClient.invalidateQueries({ queryKey: ["article-newsletter-ids"] });
        toast.success(t("editor.saved"));
        setNewsletterAnchor(null);
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
        setNewsletterAnchor(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
      setCreatingNewsletter(false);
    },
    [queryClient, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.content.delete(id);
        queryClient.invalidateQueries({ queryKey: ["content"] });
        setSelectedIDs((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (selectedArticle?.id === id) setSelectedArticle(null);
        toast.success(t("digest.deleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
    },
    [queryClient, t, selectedArticle],
  );

  // Processing step label for running state
  const stepLabel =
    processingStep < PROCESSING_STEPS.length
      ? t(`digest.${PROCESSING_STEPS[processingStep].key}`)
      : t("digest.complete");

  /* ───── loading skeleton ───── */

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-lg text-red-400">Failed to load content</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Try refreshing the page.</p>
        </div>
      </div>
    );
  }

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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-bg-surface)]">
            {t("digest.title")}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            {t("digest.waitingForReview", { count: tabCounts.novos })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={running}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          >
            <Sparkles size={16} className={running ? "animate-[spin_2s_linear_infinite]" : ""} />
            {running ? t("digest.running") : t("digest.discoverArticles")}
          </button>
          <button
            onClick={() => { queryClient.invalidateQueries({ queryKey: ["content"] }); queryClient.invalidateQueries({ queryKey: ["digest", "stats"] }); }}
            className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 p-2 text-[var(--color-text-muted)] transition-all hover:bg-white/5 hover:text-[var(--color-bg-surface)] active:scale-[0.92]"
            title="Refresh" aria-label="Refresh articles"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-4 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
        <StatsBar stats={stats} selectedCount={selectedIDs.size} />
      </div>

      {/* Toolbar: filters + sort + batch newsletter */}
      <div className="mt-3 flex items-center justify-between">
        <FilterTabs active={activeTab} onChange={setActiveTab} counts={tabCounts} />
        <div className="flex items-center gap-2">
          {/* Sort */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 p-2 text-[var(--color-text-muted)] transition-all hover:bg-white/5 hover:text-[var(--color-bg-surface)] active:scale-[0.92]"
              title="Sort" aria-label="Sort articles"
            >
              <ArrowUpDown size={16} />
            </button>
            {showSortDropdown && (
              <div className="absolute right-0 top-10 z-50 w-40 animate-[scaleIn_150ms_ease-out] rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg-base)] p-1.5 shadow-2xl ring-1 ring-black/30">
                {(["newest", "oldest", "title"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setShowSortDropdown(false); }}
                    className={`flex w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                      sortBy === key
                        ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                        : "text-[var(--color-bg-surface)] hover:bg-white/10"
                    }`}
                  >
                    {t(`digest.sort${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Batch newsletter */}
          <div className="relative">
            <button
              onClick={(e) => openNewsletterSelector("batch", e)}
              disabled={selectedIDs.size === 0}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/10 active:scale-[0.97] disabled:opacity-30 disabled:cursor-default disabled:active:scale-100 disabled:hover:bg-transparent"
            >
              <Mail size={16} />
              {t("digest.addToNewsletter", { count: selectedIDs.size })}
            </button>
          </div>
        </div>
      </div>

      {/* Main content area: list + detail panel */}
      <div className="mt-4 flex flex-1 gap-0">
        {/* Card list */}
        <div className="min-w-0 flex-1 overflow-y-auto pr-4">
          {sortedItems.length === 0 && !running && (
            /* ── Empty / no-results state ── */
            <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
              {digestItems.length > 0 ? (
                /* Filters active but no matches */
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                    <EyeOff size={24} className="text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">{t("digest.noResults")}</p>
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
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:translate-y-px"
                    >
                      <Sparkles size={16} />
                      {t("digest.discoverArticles")}
                    </button>
                    <a
                      href="/settings"
                      className="cursor-pointer text-sm text-[var(--color-text-muted)] underline-offset-2 transition-colors hover:text-[var(--color-bg-surface)] hover:underline"
                    >
                      {t("digest.configureSources")}
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Running state */}
          {running && sortedItems.length === 0 && (
            <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
              <div className="mb-6 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite] [animation-delay:200ms]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite] [animation-delay:400ms]" />
              </div>
              <span className="text-sm text-[var(--color-accent-primary)]">{stepLabel}</span>
            </div>
          )}

          {/* Card list */}
          <div className="space-y-2.5">
            {sortedItems.map((item, idx) => {
              const isUsed = usedSet.has(item.id);
              const isSelected = selectedIDs.has(item.id);
              return (
                <div
                  key={item.id}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className="opacity-0 animate-[fadeIn_400ms_ease-out_forwards]"
                >
                  <ArticleCard
                    item={item}
                    isSelected={isSelected}
                    isUsed={isUsed}
                    onToggleSelect={toggleSelected}
                    onDelete={handleDelete}
                    onAddToNewsletter={openNewsletterSelector}
                    onClick={handleCardClick}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedArticle && (
          <div className="mr-2 mb-2 sticky top-0 self-start animate-[slideInRight_200ms_ease-out]">
          <DetailPanel
            item={selectedArticle}
            isSelected={selectedIDs.has(selectedArticle.id)}
            isUsed={usedSet.has(selectedArticle.id)}
            onClose={() => setSelectedArticle(null)}
            onToggleSelect={toggleSelected}
            onAddToNewsletter={(id, e) => {
              openNewsletterSelector(id, e);
            }}
          />
          </div>
        )}
      </div>

      {newsletterAnchor && (
        <NewsletterSelector
          ref={selectorRef}
          top={newsletterAnchor.top}
          right={newsletterAnchor.right}
          newsletters={draftNewsletters}
          creating={creatingNewsletter}
          onSelect={(id) => addToNewsletter(id, newsletterAnchor.articleId)}
          onCreateNew={() => createAndAddToNewsletter(newsletterAnchor.articleId)}
        />
      )}
    </div>
  );
}

/* ───── Newsletter selector dropdown ───── */

const NewsletterSelector = forwardRef<HTMLDivElement, {
  top?: number;
  right?: number;
  newsletters: NewsletterEdition[];
  creating: boolean;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}>(({ top, right, newsletters, creating, onSelect, onCreateNew }, ref) => {
  const { t } = useTranslation();
  return (
  <div
    ref={ref}
    className="fixed z-50 w-56 animate-[scaleIn_150ms_ease-out_forwards] origin-top-right rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg-base)] p-2 shadow-2xl ring-1 ring-black/30"
    style={{ top, right }}
  >
    <p className="px-2 py-1 text-xs font-medium text-[var(--color-text-muted)]">
      {t("digest.addToNewsletterLabel")}
    </p>
    {newsletters.length === 0 && (
      <p className="px-2 py-2 text-xs text-[var(--color-text-muted)]">
        {t("digest.noDraftNewsletters")}
      </p>
    )}
    {newsletters.map((nl) => (
      <button
        key={nl.id}
        onClick={() => onSelect(nl.id)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-bg-surface)] transition-colors hover:bg-white/10"
      >
        <Mail size={14} className="shrink-0 text-[var(--color-accent-primary)]" />
        <span className="truncate">{nl.title || t("digest.noTitle")}</span>
      </button>
    ))}
    <div className="mt-1 border-t border-[var(--color-border)]/10 pt-1">
      <button
        onClick={onCreateNew}
        disabled={creating}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/10 disabled:opacity-50"
      >
        <Plus size={14} />
        {creating ? t("digest.creatingNewsletter") : t("digest.createNewNewsletter")}
      </button>
    </div>
  </div>
  );
});

NewsletterSelector.displayName = "NewsletterSelector";
