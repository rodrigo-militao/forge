import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit3, FileText, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ContentItem } from "../../api/client";
import { queryKeys } from "../../lib/queryKeys";
import { formatTimeAgo } from "../../lib/time";
import { FilterTabs, type FilterTabItem } from "../../components/ui/filter-tabs";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";

export type StatusFilter = "all" | "building" | "review" | "ready" | "published" | "discarded";

const statusDotColors: Record<string, string> = {
  building: "bg-[var(--color-accent-primary)]",
  review: "bg-amber-400",
  ready: "bg-[var(--color-accent-success)]",
  published: "bg-[var(--color-bg-surface)]",
  discarded: "bg-[var(--color-text-muted)]",
};

const statusMeta: Record<string, { labelKey: string; dot: string }> = {
  building: { labelKey: "articles.status_building", dot: "bg-[var(--color-accent-primary)]" },
  review: { labelKey: "articles.status_review", dot: "bg-amber-400" },
  ready: { labelKey: "articles.status_ready", dot: "bg-[var(--color-accent-success)]" },
  published: { labelKey: "articles.status_published", dot: "bg-[var(--color-bg-surface)]" },
  discarded: { labelKey: "articles.status_discarded", dot: "bg-[var(--color-text-muted)]" },
};

export function filterArticles(items: ContentItem[], statusFilter: StatusFilter, searchQuery: string): ContentItem[] {
  return items.filter((c) => {
    if (c.type !== "article" || c.deleted_at !== null) return false;
    if (c.product !== "compose") return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.title?.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function ArticleWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [discardTarget, setDiscardTarget] = useState<string | null>(null);

  const statusFilterTabs: FilterTabItem[] = useMemo(() => [
    { id: "all", labelKey: "articles.allStatuses" },
    { id: "building", labelKey: "articles.status_building" },
    { id: "review", labelKey: "articles.status_review" },
    { id: "ready", labelKey: "articles.status_ready" },
    { id: "published", labelKey: "articles.status_published" },
    { id: "discarded", labelKey: "articles.status_discarded" },
  ], []);

  const { data: content, isLoading, error } = useQuery({
    queryKey: queryKeys.content.all,
    queryFn: () => api.content.list({ product: "compose" }),
  });

  const articles = useMemo(() => filterArticles(content ?? [], statusFilter, searchQuery), [content, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of content ?? []) {
      if (c.type !== "article" || c.deleted_at !== null) continue;
      counts.all = (counts.all ?? 0) + 1;
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    return counts;
  }, [content]);

  const handleNewArticle = useCallback(async () => {
    navigate({ to: "/content/articles/new" });
  }, [navigate]);

  const handleOpenEditor = useCallback((id: string) => {
    navigate({ to: `/content/articles/${id}/edit` });
  }, [navigate]);

  const handleDiscard = useCallback(async (id: string) => {
    try {
      await api.content.delete(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
    } catch {
      // Error state handled by query invalidation
    }
    setDiscardTarget(null);
  }, [queryClient]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full flex-col p-6">
        <div className="mb-5">
          <div className="skeleton skeleton-title !mb-0 !h-10 w-48" />
          <div className="skeleton skeleton-text !mt-3 w-64" />
        </div>
        <div className="mb-4 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton !h-8 !w-20 rounded-md" />
          ))}
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card !mb-0 !h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 rounded-full bg-[var(--color-accent-danger)]/10 p-4">
          <FileText size={32} className="text-[var(--color-accent-danger)]" />
        </div>
        <p className="text-base font-medium text-[var(--color-bg-surface)]">{t("articles.error")}</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("articles.error")}</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.content.all })}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-primary)]/20 transition-all duration-[var(--duration-fast)] hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/25 active:scale-[0.96] cursor-pointer"
        >
          {t("digest.retry")}
        </button>
      </div>
    );
  }

  const buildingCount = statusCounts.building ?? 0;
  const readyCount = statusCounts.ready ?? 0;

  return (
    <div className="flex h-full flex-col p-6 animate-[fadeIn_400ms_ease-out_forwards]">
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-[var(--font-display)] text-3xl font-bold leading-tight text-[var(--color-bg-surface)]">{t("articles.title")}</h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          {buildingCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary)]" />
              {buildingCount} {t("articles.status_building").toLowerCase()}
            </span>
          )}
          {buildingCount > 0 && readyCount > 0 && <span className="text-[var(--color-text-muted)]/50">·</span>}
          {readyCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent-success)]" />
              {readyCount} {t("articles.status_ready").toLowerCase()}
            </span>
          )}
          {buildingCount === 0 && readyCount === 0 && (
            <span>{statusCounts.all ?? 0} {t("articles.title").toLowerCase()}</span>
          )}
        </div>
      </div>

      {/* Toolbar: filters + search */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterTabs
          tabs={statusFilterTabs}
          active={statusFilter}
          onChange={(tab) => setStatusFilter(tab as StatusFilter)}
          counts={statusCounts}
        />

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("articles.searchPlaceholder")}
              aria-label={t("articles.searchPlaceholder")}
              className="w-48 rounded-lg border border-[var(--color-border)]/10 bg-white/5 pl-8 pr-2.5 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          <button
            onClick={handleNewArticle}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-primary)]/20 transition-all duration-[var(--duration-fast)] hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/25 active:scale-[0.96] cursor-pointer"
          >
            <Plus size={17} strokeWidth={2.5} /> {t("articles.newArticle")}
          </button>
        </div>
      </div>

      {/* Empty states */}
      {articles.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-[var(--color-accent-primary)]/10 p-4">
            <FileText size={32} className="text-[var(--color-accent-primary)]" />
          </div>
          {searchQuery ? (
            <>
              <p className="text-sm text-[var(--color-text-muted)]">{t("articles.noSearchResults")}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("articles.noSearchResultsHint")}</p>
            </>
          ) : statusFilter !== "all" ? (
            <>
              <p className="text-sm text-[var(--color-text-muted)]">{t("articles.noArticlesWithStatus")}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("articles.noArticlesWithStatusHint")}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--color-text-muted)]">{t("articles.empty")}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("articles.emptyHint")}</p>
              <button
                onClick={handleNewArticle}
                className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-primary)]/20 transition-all duration-[var(--duration-fast)] hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/25 active:scale-[0.96] cursor-pointer"
              >
                <Plus size={17} strokeWidth={2.5} /> {t("articles.newArticle")}
              </button>
            </>
          )}
        </div>
      )}

      {/* Articles list */}
      {articles.length > 0 && (
        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
          {articles.map((article, idx) => {
            const meta = statusMeta[article.status] ?? statusMeta.building;
            return (
              <div
                key={article.id}
                className="group w-full rounded-xl border border-[var(--color-border)]/10 bg-white/[0.02] p-4 text-left transition-all duration-[var(--duration-base)] hover:border-[var(--color-accent-primary)]/25 hover:bg-white/[0.05] hover:shadow-md hover:shadow-black/5 cursor-pointer animate-[fadeIn_400ms_ease-out_forwards]"
                onClick={() => handleOpenEditor(article.id)}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Top row: status dot + label | indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
                    <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                      {t(meta.labelKey)}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="mt-1.5 truncate text-sm font-medium text-[var(--color-bg-surface)]">
                  {article.title || t("articles.untitled")}
                </h3>

                {/* Metadata: time ago | origin */}
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                  <span>{formatTimeAgo(article.updated_at, t)}</span>
                  {article.origin && (
                    <>
                      <span className="text-[var(--color-text-muted)]/30">|</span>
                      <span className="capitalize">{article.origin === "ai_generated" ? t("articles.aiGenerated") : t("articles.manual")}</span>
                    </>
                  )}
                </div>

                {/* Tags */}
                {article.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--color-accent-primary)]/15 px-1.5 py-0.5 text-[10px] text-[var(--color-accent-primary)]"
                      >
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">+{article.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Bottom row: actions */}
                <div className="mt-2.5 flex items-center justify-end">
                  <div className="flex items-center gap-1 opacity-40 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenEditor(article.id); }}
                      data-tooltip={t("editor.edit")}
                      aria-label={t("editor.edit")}
                      className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-accent-primary)]"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDiscardTarget(article.id); }}
                      data-tooltip={t("articles.discard")}
                      aria-label={t("articles.discard")}
                      className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-danger)]/15 hover:text-[var(--color-accent-danger)]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        open={discardTarget !== null}
        message={t("articles.discardConfirm")}
        confirmLabel={t("articles.discard")}
        onConfirm={() => { if (discardTarget) handleDiscard(discardTarget); }}
        onCancel={() => setDiscardTarget(null)}
      />
    </div>
  );
}
