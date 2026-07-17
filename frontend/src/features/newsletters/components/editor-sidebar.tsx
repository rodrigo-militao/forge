import { useTranslation } from "react-i18next";
import { X, Sparkles, FileText, MessageSquarePlus } from "lucide-react";
import type { ArticleRef } from "../../../api/client";
import type { SidebarTab } from "../hooks/use-editor-workspace";

// ---------------------------------------------------------------------------
// AI tab
// ---------------------------------------------------------------------------

function AITab({
  onGenerateIntro,
  generating,
}: {
  onGenerateIntro: () => void;
  generating: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 p-3">
      <button
        onClick={onGenerateIntro}
        disabled={generating}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-xs text-[var(--color-bg-surface)] transition-colors hover:bg-white/[0.04] disabled:opacity-50"
        aria-busy={generating}
      >
        {generating ? (
          <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-[var(--color-accent-primary)]/30 border-t-[var(--color-accent-primary)]" />
        ) : (
          <Sparkles size={14} className="shrink-0 text-[var(--color-accent-primary)]" />
        )}
        <span>{generating ? t("newsletters.generating") : t("newsletters.improveIntro")}</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Articles tab
// ---------------------------------------------------------------------------

function ArticlesTabContent({
  articles,
  availableArticles,
  onAddArticle,
  onRemoveArticle,
  removingArticle,
}: {
  articles: ArticleRef[];
  availableArticles: { id: string; title: string | null }[];
  onAddArticle: (id: string) => Promise<void>;
  onRemoveArticle: (id: string) => void;
  removingArticle: string | null;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-3">
      {articles.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--color-text-muted)]/60">
            {t("newsletters.articlesInNewsletter")} ({articles.length})
          </p>
          {articles.map((article) => (
            <div
              key={article.content_id}
              className="flex items-start gap-2 rounded-md px-2.5 py-2 transition-colors hover:bg-white/[0.03]"
            >
              <FileText size={12} className="mt-0.5 shrink-0 text-[var(--color-accent-primary)]/60" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-[var(--color-bg-surface)]">{article.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[10px] text-[var(--color-text-muted)]">{article.body_markdown}</p>
              </div>
              <button
                onClick={() => onRemoveArticle(article.content_id)}
                disabled={removingArticle === article.content_id}
                className="shrink-0 cursor-pointer rounded p-1 text-[var(--color-text-muted)]/50 transition-colors hover:bg-[var(--color-accent-danger)]/10 hover:text-[var(--color-accent-danger)] disabled:opacity-50"
                aria-label={t("newsletters.removeArticle")}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          {t("newsletters.noArticlesYet")}
        </p>
      )}

      {availableArticles.length > 0 && (
        <div className="mt-4 space-y-1">
          <p className="text-xs font-semibold text-[var(--color-text-muted)]/60">
            {t("newsletters.availableArticles")} ({availableArticles.length})
          </p>
          <div className="max-h-36 space-y-0.5 overflow-y-auto">
            {availableArticles.map((c) => (
              <button
                key={c.id}
                onClick={() => onAddArticle(c.id)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--color-bg-surface)]"
              >
                <MessageSquarePlus size={11} className="shrink-0 text-[var(--color-accent-primary)]/50" />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditorSidebar — main component
// ---------------------------------------------------------------------------

interface EditorSidebarProps {
  articles: ArticleRef[];
  availableArticles: { id: string; title: string | null }[];
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  onAddArticle: (id: string) => Promise<void>;
  onRemoveArticle: (id: string) => void;
  removingArticle: string | null;
  onGenerateIntro: () => void;
  generating: boolean;
}

const TAB_META: Record<SidebarTab, { icon: typeof Sparkles; labelKey: string }> = {
  ai: { icon: Sparkles, labelKey: "newsletters.ai" },
  articles: { icon: FileText, labelKey: "newsletters.articles" },
};

export function EditorSidebar({
  articles,
  availableArticles,
  activeTab,
  onTabChange,
  onClose,
  onAddArticle,
  onRemoveArticle,
  removingArticle,
  onGenerateIntro,
  generating,
}: EditorSidebarProps) {
  const { t } = useTranslation();

  const tabs = Object.entries(TAB_META) as [SidebarTab, typeof TAB_META[SidebarTab]][];

  return (
    <>
      {/* Tab bar */}
      <div className="flex items-center border-b border-[var(--color-border)]/10" role="tablist">
        <div className="flex flex-1">
          {tabs.map(([id, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === id
                    ? "border-b-2 border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]"
                    : "text-[var(--color-text-muted)]/60 hover:text-[var(--color-bg-surface)]"
                }`}
                role="tab"
                aria-selected={activeTab === id}
              >
                <Icon size={12} />
                {t(meta.labelKey)}
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mr-1.5 cursor-pointer rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          aria-label={t("newsletters.closeSidebar")}
        >
          <X size={14} />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex flex-1 flex-col overflow-hidden animate-[fadeIn_200ms_ease-out_forwards]" role="tabpanel">
        {activeTab === "ai" && (
          <AITab onGenerateIntro={onGenerateIntro} generating={generating} />
        )}
        {activeTab === "articles" && (
          <ArticlesTabContent
            articles={articles}
            availableArticles={availableArticles}
            onAddArticle={onAddArticle}
            onRemoveArticle={onRemoveArticle}
            removingArticle={removingArticle}
          />
        )}
      </div>
    </>
  );
}
