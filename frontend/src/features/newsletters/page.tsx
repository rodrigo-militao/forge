import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { ArrowUpDown, ChevronLeft, Plus, Sparkles } from "lucide-react";
import { api, type ArticleRef, type NewsletterEdition } from "../../api/client";
import { FilterTabs } from "../digest/components/filter-tabs";
import type { FilterTabItem } from "../digest/components/filter-tabs";
import { NewsletterListCard } from "./components/newsletter-list-card";
import { NewsletterDetailPanel } from "./components/detail-panel";

type SortKey = "newest" | "oldest" | "title";

const newsletterTabs: FilterTabItem[] = [
  { id: "todas", labelKey: "newsletters.tabTodas" },
  { id: "building", labelKey: "newsletters.tabBuilding" },
  { id: "ready", labelKey: "newsletters.tabReady" },
  { id: "published", labelKey: "newsletters.tabPublished" },
  { id: "archived", labelKey: "newsletters.tabArchived" },
];

function sortItems(items: NewsletterEdition[], sort: SortKey) {
  return [...items].sort((a, b) => {
    if (sort === "newest") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    if (sort === "oldest") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

export function NewslettersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<NewsletterEdition | null>(null);
  const [generating, setGenerating] = useState(false);
  const [articles, setArticles] = useState<ArticleRef[]>([]);
  const [removingArticle, setRemovingArticle] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<NewsletterEdition | null>(null);
  const [activeTab, setActiveTab] = useState<string>("todas");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const articlesReqRef = useRef(0);

  const { data: editions, isLoading, isError } = useQuery({
    queryKey: ["editions"],
    queryFn: () => api.newsletters.list(),
  });

  const handleCreate = useCallback(async () => {
    try {
      const edition = await api.newsletters.create({ title: t("newsletters.newNewsletter") });
      setSelectedItem(edition);
      setPreviewItem(null);
      setShowPreview(false);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [queryClient, t]);

  const handleSelect = useCallback(async (item: NewsletterEdition) => {
    setSelectedItem(item);
    setShowPreview(false);
    setPreviewItem(null);
    const reqId = ++articlesReqRef.current;
    setArticles([]);
    try {
      const arts = await api.newsletters.articles(item.id);
      if (reqId !== articlesReqRef.current) return;
      setArticles(arts);
    } catch {
      toast.error(t("newsletters.failedToLoadArticles"));
    }
  }, [t]);

  const handleEditNavigation = useCallback((item?: NewsletterEdition) => {
    const target = item ?? selectedItem;
    if (!target) return;
    navigate({ to: `/content/newsletters/${target.id}/edit` });
  }, [navigate, selectedItem]);

  const handlePreview = useCallback((item?: NewsletterEdition) => {
    const target = item ?? selectedItem;
    if (!target) return;
    setPreviewItem(target);
    setShowPreview(true);
  }, [selectedItem]);

  const handleDuplicate = useCallback(async (item: NewsletterEdition) => {
    const name = item.title || t("newsletters.noTitle");
    if (!window.confirm(`${t("newsletters.confirmDuplicate")} "${name}"?`)) return;
    try {
      const dup = await api.newsletters.duplicate(item.id);
      toast.success(t("newsletters.newsletterDuplicated"));
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      setSelectedItem(dup);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failedToDuplicate"));
    }
  }, [queryClient, t]);

  const handleCloseDetailPanel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleArchive = useCallback(async (item: NewsletterEdition) => {
    const name = item.title || t("newsletters.noTitle");
    if (!window.confirm(`${t("newsletters.confirmArchive")} "${name}"?`)) return;
    try {
      await api.newsletters.updateStatus(item.id, "archived");
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      setSelectedItem((prev) => prev?.id === item.id ? { ...prev, status: "archived" as const } : prev);
      toast.success(t("newsletters.archivedSuccessfully"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [queryClient, t]);

  const handleUnarchive = useCallback(async () => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateStatus(selectedItem.id, "building");
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      setSelectedItem((prev) => prev ? { ...prev, status: "building" as const } : null);
      toast.success(t("newsletters.unarchivedSuccessfully"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient, t]);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateStatus(selectedItem.id, status);
      setSelectedItem((prev) => prev ? { ...prev, status: status as NewsletterEdition["status"] } : null);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      toast.success(t("editor.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient, t]);

  const handleCategoryChange = useCallback(async (category: string | null) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateCategory(selectedItem.id, category);
      setSelectedItem((prev) => prev ? { ...prev, category } : null);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient, t]);

  const handleDestinationChange = useCallback(async (destination: string | null) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateDestination(selectedItem.id, destination);
      setSelectedItem((prev) => prev ? { ...prev, destination } : null);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["editions", "destinations"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient, t]);

  const handleAddArticle = useCallback(async (contentID: string) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.addArticle(selectedItem.id, contentID);
      const [freshEdition, arts] = await Promise.all([
        api.newsletters.get(selectedItem.id),
        api.newsletters.articles(selectedItem.id),
      ]);
      setSelectedItem(freshEdition);
      setArticles(arts);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["article-newsletter-ids"] });
      toast.success(t("newsletters.articleAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failedToAdd"));
    }
  }, [selectedItem, queryClient, t]);

  const handleRemoveArticle = useCallback(async (contentID: string) => {
    if (!selectedItem) return;
    setRemovingArticle(contentID);
    try {
      await api.newsletters.removeArticle(selectedItem.id, contentID);
      setArticles((prev) => prev.filter((a) => a.content_id !== contentID));
      const freshEdition = await api.newsletters.get(selectedItem.id);
      setSelectedItem(freshEdition);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["article-newsletter-ids"] });
      toast.success(t("newsletters.articleRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
    setRemovingArticle(null);
  }, [selectedItem, queryClient, t]);

  const handleGenerateIntro = useCallback(async () => {
    if (!selectedItem || generating) return;
    setGenerating(true);
    try {
      await api.newsletters.generateIntro(selectedItem.id);
      toast.success(t("newsletters.introQueued"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
      setGenerating(false);
    }
  }, [selectedItem, generating, t]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showPreview || showSortDropdown) return;
      switch (e.key) {
        case "n":
          e.preventDefault();
          handleCreate();
          break;
        case "e":
          if (selectedItem) {
            e.preventDefault();
            handleEditNavigation();
          }
          break;
        case "a":
          if (selectedItem && selectedItem.status !== "archived") {
            e.preventDefault();
            handleArchive(selectedItem);
          }
          break;
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showPreview, showSortDropdown, selectedItem, handleCreate, handleEditNavigation, handleArchive]);

  // Wait for intro generation via SSE
  useEffect(() => {
    if (!generating) return;
    const timeout = setTimeout(() => setGenerating(false), 90000);
    return () => clearTimeout(timeout);
  }, [generating]);

  useEffect(() => {
    if (!generating || !selectedItem || !editions) return;
    const updated = editions.find((e) => e.id === selectedItem.id);
    if (updated && updated.body_html !== selectedItem.body_html) {
      setGenerating(false);
      setSelectedItem(updated);
      toast.success(t("newsletters.introReady"));
    }
  }, [editions, selectedItem, generating, t]);

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

  // Escape key closes panels
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showPreview) { setShowPreview(false); setPreviewItem(null); return; }
        if (selectedItem) { setSelectedItem(null); }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showPreview, selectedItem]);

  // --- Data ---
  const items = editions ?? [];
  const buildingCount = items.filter((i) => i.status === "building").length;
  const readyCount = items.filter((i) => i.status === "ready").length;
  const publishedCount = items.filter((i) => i.status === "published").length;
  const archivedCount = items.filter((i) => i.status === "archived").length;

  // Tab counts
  const tabCounts: Record<string, number> = {
    todas: items.length,
    building: buildingCount,
    ready: readyCount,
    published: publishedCount,
    archived: archivedCount,
  };

  // Tab filtering
  const filteredByTab = activeTab === "todas"
    ? items
    : items.filter((i) => i.status === activeTab);

  const sortedItems = sortItems(filteredByTab, sortBy);

  // --- Error state ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-danger)]/15">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent-danger)]"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="mb-1 text-base font-medium text-[var(--color-bg-surface)]">{t("newsletters.failedToLoad")}</h2>
        <p className="mb-4 text-xs text-[var(--color-text-muted)]">{t("newsletters.tryAgainLater")}</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["editions"] })}
          className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
        >
          {t("newsletters.retry")}
        </button>
      </div>
    );
  }

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="skeleton skeleton-title !mb-0 !h-8 w-48" />
          <div className="skeleton !mb-0 !h-9 w-32 rounded-lg" />
        </div>
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton skeleton-text !w-20 rounded-full" />
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card rounded-lg" style={{ height: 96 }} />
          ))}
        </div>
      </div>
    );
  }

  // --- Preview mode ---
  if (showPreview && previewItem) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-[fadeIn_400ms_ease-out_forwards]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setShowPreview(false); setPreviewItem(null); }}
            className="group cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
          >
            <ChevronLeft size={16} />
            {t("newsletters.backToList")}
          </button>
          {previewItem.status === "ready" && (
            <button
              onClick={async () => {
                try {
                  await api.newsletters.updateStatus(previewItem.id, "published");
                  queryClient.invalidateQueries({ queryKey: ["editions"] });
                  toast.success(t("newsletters.markAsPublished"));
                  setShowPreview(false);
                  setPreviewItem(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
                }
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--color-accent-primary)]/90 hover:scale-[1.03] active:scale-[0.97]"
            >
              <Sparkles size={16} />
              {t("newsletters.markAsPublished")}
            </button>
          )}
        </div>
        <div className="rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02] p-6">
          <h1 className="mb-2 font-[var(--font-display)] text-2xl font-semibold text-[var(--color-bg-surface)]">
            {previewItem.title || t("newsletters.noTitle")}
          </h1>
          {previewItem.destination && (
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">
              {t("newsletters.destination")}: {previewItem.destination}
            </p>
          )}
          <div
            className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--color-bg-surface)]/90 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_a]:text-[var(--color-accent-primary)] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: previewItem.body_html }}
          />
        </div>
      </div>
    );
  }

  // --- Main view: header + stats + toolbar + list + sidebar ---
  return (
    <div className="flex h-full flex-col p-6 animate-[fadeIn_400ms_ease-out_forwards]">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl font-bold leading-tight text-[var(--color-bg-surface)]">
            {t("newsletters.title")}
          </h1>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent-primary)]" />
              {buildingCount} {t("newsletters.building").toLowerCase()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent-success)]" />
              {readyCount} {t("newsletters.ready").toLowerCase()}
            </span>
            <span className="text-[var(--color-text-muted)]/50">·</span>
            <span>{publishedCount} {t("newsletters.published").toLowerCase()}</span>
            <span>{archivedCount} {t("newsletters.archived").toLowerCase()}</span>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-primary)]/20 transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-accent-primary)]/90 hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/25 hover:scale-[1.04] active:scale-[0.96]"
        >
          <Plus size={17} strokeWidth={2.5} />
          {t("newsletters.newNewsletter")}
        </button>
      </div>

      {/* Toolbar: filters + sort */}
      <div className="mb-4 flex items-center justify-between">
        <FilterTabs tabs={newsletterTabs} active={activeTab} onChange={setActiveTab} counts={tabCounts} />
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)]/20 px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] transition-all hover:bg-white/5 hover:text-[var(--color-bg-surface)] active:scale-[0.92]"
            data-tooltip={t("digest.sortLabel")} aria-label={t("digest.sortLabel")}
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
                  {t(`newsletters.sort${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content: list + detail panel */}
      <div className="flex flex-1 gap-0 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Card list */}
        <div className="min-w-0 flex-1 overflow-y-auto pr-4">
          {sortedItems.length === 0 ? (
            /* Empty state per tab */
            <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
              {items.length === 0 ? (
                /* Truly empty — no newsletters at all */
                <>
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent-primary)]/20 to-[var(--color-accent-primary)]/5 shadow-inner shadow-white/[0.03]">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent-primary)]">
                      <path d="M22 10.5V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <p className="mb-5 text-sm text-[var(--color-text-muted)]">{t("newsletters.noNewsletters")}</p>
                  <button
                    onClick={handleCreate}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-[var(--color-accent-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-primary)]/20 transition-all hover:bg-[var(--color-accent-primary)]/90 hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/25 hover:scale-[1.05] active:scale-[0.95]"
                  >
                    <Plus size={17} strokeWidth={2.5} />
                    {t("newsletters.newNewsletter")}
                  </button>
                </>
              ) : (
                /* Filter active but no matches */
                <p className="text-sm text-[var(--color-text-muted)]">
                  {t("newsletters.noNewslettersInStage")}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedItems.map((item, idx) => (
                <div
                  key={item.id}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className="opacity-0 animate-[fadeIn_400ms_ease-out_forwards]"
                >
                  <NewsletterListCard
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={handleSelect}
                    onEdit={handleEditNavigation}
                    onDuplicate={handleDuplicate}
                    onPreview={handlePreview}
                    onArchive={handleArchive}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <NewsletterDetailPanel
            item={selectedItem}
            articles={articles}
            removingArticle={removingArticle}
            generating={generating}
            onClose={handleCloseDetailPanel}
            onEdit={() => handleEditNavigation()}
            onPreview={() => handlePreview()}
            onDuplicate={handleDuplicate}
            onStatusChange={handleStatusChange}
            onCategoryChange={handleCategoryChange}
            onRemoveArticle={handleRemoveArticle}
            onAddArticle={handleAddArticle}
            onGenerateIntro={handleGenerateIntro}
            onDestinationChange={handleDestinationChange}
            onNavigateToDiscover={() => navigate({ to: "/discover" })}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
          />
        )}
      </div>
    </div>
  );
}
