import { useTranslation } from "react-i18next";
import { EyeOff, Sparkles } from "lucide-react";
import type { ContentItem } from "../../../api/client";
import { api } from "../../../api/client";
import { ArticleCard } from "./article-card";

type SortKey = "newest" | "oldest" | "title";

function sortArticles(items: ContentItem[], sort: SortKey) {
  return [...items].sort((a, b) => {
    if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

interface DigestArticleListProps {
  sortedItems: ContentItem[];
  digestItems: ContentItem[];
  selectedIDs: Set<string>;
  setSelectedIDs: (ids: Set<string>) => void;
  toggleSelected: (id: string) => void;
  handleRun: () => void;
  handleCardClick: (id: string) => void;
  openNewsletterSelector: (target: string, e?: React.MouseEvent) => void;
  handleDelete: (id: string) => void;
  handleCreateArticle: (item: ContentItem) => void;
  handleCreateIdea: (item: ContentItem) => void;
  usedSet: Set<string>;
  activeTab: string;
  running: boolean;
  contextualTipKey: string | null;
  stepLabel: string;
  sortBy: SortKey;
}

export function DigestArticleList({
  sortedItems: rawSortedItems,
  digestItems,
  selectedIDs,
  setSelectedIDs,
  toggleSelected,
  handleRun,
  handleCardClick,
  openNewsletterSelector,
  handleDelete,
  handleCreateArticle,
  handleCreateIdea,
  usedSet,
  activeTab,
  running,
  contextualTipKey,
  stepLabel,
  sortBy,
}: DigestArticleListProps) {
  const { t } = useTranslation();
  const sortedItems = sortArticles(rawSortedItems, sortBy);

  return (
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

      {/* Empty state */}
      {sortedItems.length === 0 && !running && (
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

      {/* Running state */}
      {running && (
        <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
          <div className="mb-6 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite] [animation-delay:200ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-primary)] animate-[dotSweep_1.2s_ease-in-out_infinite] [animation-delay:400ms]" />
          </div>
          <span className="text-sm text-[var(--color-accent-primary)]">{stepLabel}</span>
          <button
            onClick={async () => {
              await api.digest.cancel().catch(() => {});
            }}
            className="mt-3 cursor-pointer text-xs text-[var(--color-text-muted)] underline-offset-2 transition-colors hover:text-[var(--color-bg-surface)] hover:underline"
          >
            {t("settings.cancel")}
          </button>
        </div>
      )}

      {/* Card list (hidden while running) */}
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
                  onCreateArticle={handleCreateArticle}
                  onCreateIdea={handleCreateIdea}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
