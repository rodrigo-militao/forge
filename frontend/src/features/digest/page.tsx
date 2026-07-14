import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, ChevronRight, EyeOff, Mail, Plus, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, type ContentItem, type NewsletterEdition, type DigestSource, type DigestInterest, type DigestJob } from "../../api/client";
import { useAuth } from "../auth/store";
import { StatsBar, formatTimeAgo } from "./components/stats-bar";
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function jobTypeDisplayName(type: string, t: (key: string) => string): string {
  const key = `digest.jobType${capitalize(type)}`;
  const translated = t(key);
  return translated !== key ? translated : type;
}

function StatusDot({ status }: { status: DigestJob["status"] }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500",
    processing: "bg-blue-500 animate-pulse",
    done: "bg-green-500",
    failed: "bg-red-500",
  };
  return <span className={`h-2 w-2 rounded-full ${colors[status] ?? "bg-gray-500"}`} />;
}

/* ───── component ───── */

export function DigestPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FilterTab>("novos");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selectedArticle, setSelectedArticle] = useState<ContentItem | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const runningSinceRef = useRef(0);

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
  const [showJobs, setShowJobs] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const { data: content, isLoading, isError, dataUpdatedAt } = useQuery({
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

  const { data: jobs } = useQuery({
    queryKey: ["digest", "jobs"],
    queryFn: api.digest.jobs,
    enabled: showJobs,
  });

  const user = useAuth((s) => s.user);
  const { data: sources } = useQuery({
    queryKey: ["digest-sources"],
    queryFn: api.digest.sources.list,
    staleTime: 30000,
  });
  const { data: interestsData } = useQuery({
    queryKey: ["digest-interests"],
    queryFn: api.digest.interests.list,
    staleTime: 30000,
  });

  const hasActiveSources = (sources ?? []).some((s: DigestSource) => s.enabled);
  const hasActiveInterests = (interestsData ?? []).some((i: DigestInterest) => i.enabled);

  const usedSet = new Set(usedIDs ?? []);

  // All non-deleted digest items
  const digestItems = (content ?? []).filter(
    (c) => c.product === "digest" && c.deleted_at === null,
  );

  // Contextual tip for empty state
  let contextualTipKey: string | null = null;
  if (digestItems.length === 0) {
    if (user?.restrict_search_to_sources && !hasActiveSources) {
      contextualTipKey = "digest.restrictNoSources";
    } else if (!hasActiveSources && !hasActiveInterests) {
      contextualTipKey = "digest.noSourcesNoInterests";
    } else {
      contextualTipKey = "digest.emptyWithSources";
    }
  }

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

  // Pick up an active job on page load (from a previous session / another tab)
  useEffect(() => {
    if (running) return;
    if (stats?.active_job_status !== "processing" && stats?.active_job_status !== "pending") return;
    if (content === undefined) return;
    setRunning(true);
    runningSinceRef.current = Date.now();
    setProcessingStep(1);
  }, [running, stats?.active_job_status, content]);

  // Safety timeout: stop running after 60s if SSE never fires
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      setRunning(false);
      setProcessingStep(3);
    }, 60000);
    return () => clearTimeout(timer);
  }, [running]);

  // Detect completion via dataUpdatedAt — SSE refetch updates this
  useEffect(() => {
    if (!running || !dataUpdatedAt) return;
    if (dataUpdatedAt > runningSinceRef.current) {
      runningSinceRef.current = 0;
      setRunning(false);
      setProcessingStep(3);
    }
  }, [dataUpdatedAt, running]);

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
    runningSinceRef.current = Date.now();
    try {
      await api.digest.run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("digest.runFailed");
      if (msg.includes("already in progress")) {
        toast(msg, { icon: "ℹ️" });
      } else {
        toast.error(msg);
      }
      setRunning(false);
    }
  }, [t, queryClient]);
  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === "d" && !running) {
        e.preventDefault();
        handleRun();
      }
      if (key === "s") {
        e.preventDefault();
        setShowSortDropdown((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [running, handleRun]);



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

        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-4 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
        <StatsBar stats={stats} selectedCount={selectedIDs.size} />
      </div>

      {/* Jobs section */}
      {jobs && jobs.length > 0 && (
        <div className="mt-3 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
          <button
            onClick={() => setShowJobs(!showJobs)}
            className="flex cursor-pointer items-center gap-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-bg-surface)]"
          >
            <ChevronRight size={12} className={`transition-transform ${showJobs ? "rotate-90" : ""}`} />
            {t("digest.jobsTitle")} ({jobs.length})
          </button>
          {showJobs && (
            <div className="mt-2 space-y-1 rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02] p-2">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center gap-2 text-xs">
                  <StatusDot status={job.status} />
                  <span className="font-medium text-[var(--color-bg-surface)]">{jobTypeDisplayName(job.type, t)}</span>
                  <span className="text-[var(--color-text-muted)]">{t(`digest.job${capitalize(job.status)}`)}</span>
                  {job.error && <span className="text-red-400" title={job.error}>!</span>}
                  <span className="ml-auto text-[var(--color-text-muted)]">
                    {formatTimeAgo(job.created_at, t)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toolbar: filters + sort + batch newsletter */}
      <div className="mt-3 flex items-center justify-between">
        <FilterTabs active={activeTab} onChange={setActiveTab} counts={tabCounts} />
        <div className="flex items-center gap-2">
          {/* Sort */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)]/20 px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] transition-all hover:bg-white/5 hover:text-[var(--color-bg-surface)] active:scale-[0.92]"
              title="Sort" aria-label="Sort articles"
            >
              <ArrowUpDown size={14} />
              {t("digest.sortLabel")}
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
        {/* Card list with select all */}
        <div className="min-w-0 flex-1 overflow-y-auto pr-4">
          {/* Select all */}
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={() => {
                const allVisibleIDs = new Set(sortedItems.map((c) => c.id));
                const allSelected = [...allVisibleIDs].every((id) => selectedIDs.has(id));
                if (allSelected) {
                  setSelectedIDs(new Set([...selectedIDs].filter((id) => !allVisibleIDs.has(id))));
                } else {
                  const next = new Set(selectedIDs);
                  allVisibleIDs.forEach((id) => next.add(id));
                  setSelectedIDs(next);
                }
              }}
              className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-bg-surface)]"
            >
              <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                [...sortedItems].every((c) => selectedIDs.has(c.id)) && sortedItems.length > 0
                  ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] text-white"
                  : "border-white/20 hover:border-[var(--color-accent-primary)]"
              }`}>
                {[...sortedItems].every((c) => selectedIDs.has(c.id)) && sortedItems.length > 0 && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </div>
              {sortedItems.length > 0 && [...sortedItems].every((c) => selectedIDs.has(c.id))
                ? t("digest.deselectAll")
                : t("digest.selectAll")}
            </button>
            {selectedIDs.size > 0 && (
              <button
                onClick={() => setSelectedIDs(new Set())}
                className="cursor-pointer text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-bg-surface)]"
              >
                Clear ({selectedIDs.size})
              </button>
            )}
          </div>
          {sortedItems.length === 0 && !running && (
            /* ── Empty / no-results state ── */
            <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
              {digestItems.length > 0 ? (
                /* Filters / tab active but no matches */
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                    <EyeOff size={24} className="text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {activeTab === "novos" ? t("digest.novosEmpty") :
                     activeTab === "selecionados" ? t("digest.selecionadosEmpty") :
                     activeTab === "enviados" ? t("digest.enviadosEmpty") :
                     t("digest.noResults")}
                  </p>
                  {(activeTab === "novos" || activeTab === "selecionados") && (
                    <button
                      onClick={handleRun}
                      className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.97]"
                    >
                      <Sparkles size={16} />
                      {t("digest.discoverArticles")}
                    </button>
                  )}
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
                  {contextualTipKey && (
                    <p className="mt-3 max-w-sm text-center text-xs text-[var(--color-text-muted)]">
                      {t(contextualTipKey)}
                    </p>
                  )}
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

          {/* Running state — always visible when running, regardless of existing items */}
          {running && (
            <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
              <div className="mb-6 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite] [animation-delay:200ms]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite] [animation-delay:400ms]" />
              </div>
              <span className="text-sm text-[var(--color-accent-primary)]">{stepLabel}</span>
            </div>
          )}

          {/* Card list (hidden while running to avoid confusion) */}
          {!running && (
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
          )}
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
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
