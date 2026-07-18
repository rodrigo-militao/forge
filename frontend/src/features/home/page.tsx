import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  PenLine,
  Mail,
  Lightbulb,
  FileText,
  ArrowRight,
  RefreshCw,
  Plus,
  ExternalLink,
  Globe,
  Search,
  Sparkles,
} from "lucide-react";
import { useHomePage, type HomeItem, type HomeInsight } from "./hooks/use-home-page";
import { formatTimeAgo } from "../../lib/time";
import type { Idea, DigestSource } from "../../api/types";

/* ───── Helpers ───── */

function statusLabel(status: string, t: (k: string) => string): string {
  if (status === "draft") return t("editor.draft");
  if (status === "building") return t("newsletters.building");
  if (status === "ready") return t("newsletters.ready");
  if (status === "published") return t("editor.published");
  return status;
}

function timeAgo(dateStr: string, t: (k: string, opts?: Record<string, unknown>) => string): string {
  return formatTimeAgo(dateStr, t) || "";
}

/* ───── Loading state ───── */

export function HomeLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Hero skeleton */}
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="skeleton skeleton-title !w-72" />
          <div className="skeleton skeleton-text !w-96" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton !mb-0 !h-9 w-36 rounded-lg" />
          <div className="skeleton !mb-0 !h-9 w-32 rounded-lg" />
          <div className="skeleton !mb-0 !h-9 w-28 rounded-lg" />
          <div className="skeleton !mb-0 !h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Continue writing skeleton */}
      <div className="mt-14">
        <div className="mb-5 skeleton skeleton-text !w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="skeleton skeleton-card !mb-0 !h-28 rounded-lg" />
          <div className="skeleton skeleton-card !mb-0 !h-28 rounded-lg" />
          <div className="skeleton skeleton-card !mb-0 !h-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/* ───── Error state ───── */

export function HomeError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md text-center">
        <p className="text-lg text-[var(--color-accent-danger)]">{t("home.errorLoading")}</p>
        <button
          onClick={onRetry}
          className="mx-auto mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5"
        >
          <RefreshCw size={14} />
          {t("home.tryAgain")}
        </button>
      </div>
    </div>
  );
}

/* ───── Empty state ───── */

export function HomeEmpty({ onCreateArticle, onCreateNewsletter }: { onCreateArticle: () => void; onCreateNewsletter: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h2 className="font-[var(--font-display)] text-3xl text-[var(--color-bg-surface)]">
        {t("home.welcome")}
      </h2>
      <p className="mt-3 text-[var(--color-text-secondary)]">{t("home.welcomeDesc")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={onCreateArticle}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <PenLine size={16} />
          {t("home.writeArticle")}
        </button>
        <button
          onClick={onCreateNewsletter}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)]/20 px-5 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5"
        >
          <Mail size={16} />
          {t("home.createNewsletter")}
        </button>
        <Link
          to="/content/ideas"
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)]/20 px-5 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5"
        >
          <Lightbulb size={16} />
          {t("home.captureIdea")}
        </Link>
      </div>
      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        {t("home.welcomeCTA")}
      </p>
      <Link
        to="/discover"
        className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--color-accent-primary)] hover:underline"
      >
        <FileText size={14} />
        {t("home.findReferences")}
      </Link>
    </div>
  );
}

/* ───── Continue Writing card ───── */

export function ContinueCard({ item, onClick }: { item: HomeItem; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className="group flex cursor-pointer flex-col gap-2 rounded-lg border border-[var(--color-border)]/10 bg-white/5 p-4 text-left transition-all duration-200 hover:bg-white/[0.08] active:scale-[0.98]"
    >
      <div className="flex items-center gap-2">
        {item.type === "article" ? (
          <PenLine size={14} className="shrink-0 text-[var(--color-text-muted)]" />
        ) : (
          <Mail size={14} className="shrink-0 text-[var(--color-text-muted)]" />
        )}
        <span className="truncate text-xs text-[var(--color-text-muted)]">
          {item.type === "article" ? t("home.typeArticle") : t("home.typeNewsletter")}
        </span>
        <span className="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
          {statusLabel(item.status, t)}
        </span>
      </div>
      <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--color-bg-surface)] group-hover:text-[var(--color-accent-primary)] transition-colors">
        {item.title}
      </h3>
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
        <span>{t("newsletters.lastEdited")}</span>
        <span>{timeAgo(item.updatedAt, t)}</span>
      </div>
    </button>
  );
}

/* ───── Idea item ───── */

function IdeaItem({
  idea,
  index,
}: {
  idea: Idea;
  index: number;
}) {
  const { t } = useTranslation();
  return (
    <Link
      to="/content/ideas"
      style={{ animationDelay: `${index * 60}ms` }}
      className="group stagger-item flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-all duration-200 hover:border-[var(--color-border)]/10 hover:bg-white/[0.04]"
    >
      <Lightbulb size={14} className="shrink-0 text-[var(--color-accent-primary)]" />
      <span className="flex-1 truncate text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-bg-surface)] transition-colors">
        {idea.title}
      </span>
      <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
        {timeAgo(idea.updated_at, t)}
      </span>
      <ArrowRight size={12} className="shrink-0 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

/* ───── Source item ───── */

function SourceItem({ source }: { source: DigestSource }) {
  const domain = (() => {
    const url = source.config?.url;
    if (!url) return source.type === "web_search" ? "web" : "rss";
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return source.name;
    }
  })();
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Globe size={14} className="shrink-0 text-[var(--color-text-muted)]" />
      <span className="flex-1 truncate text-sm text-[var(--color-text-secondary)]">{source.name}</span>
      <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">{domain}</span>
    </div>
  );
}

/* ───── Insight icon ───── */

function InsightIcon({ icon }: { icon: HomeInsight["icon"] }) {
  const cls = "shrink-0 text-[var(--color-accent-primary)]";
  switch (icon) {
    case "lightbulb":
      return <Lightbulb size={14} className={cls} />;
    case "fileText":
      return <FileText size={14} className={cls} />;
    case "mail":
      return <Mail size={14} className={cls} />;
    case "sparkles":
      return <Sparkles size={14} className={cls} />;
    default:
      return <Lightbulb size={14} className={cls} />;
  }
}

/* ───── Main page ───── */

const DISMISSED_KEY = "forge-home-insights-dismissed";

function getDismissedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    greeting,
    continueWriting,
    recentIdeas,
    lastPublished,
    recentSources,
    insights,
    hasDraftsWithBody,
    isLoading,
    isError,
    isEmpty,
    handleContinueWriting,
    handleCreateNewsletter,
    handleCaptureIdea,
    handleRetry,
  } = useHomePage();

  const [ideaInput, setIdeaInput] = useState("");
  const [savingIdea, setSavingIdea] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);

  const visibleInsights = insights.filter((i) => !dismissedIds.includes(i.id));

  const dismissInsight = useCallback((insightId: string) => {
    const next = [...dismissedIds, insightId];
    setDismissedIds(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch { /* noop */ }
  }, [dismissedIds]);

  const handleIdeaSubmit = useCallback(async () => {
    if (!ideaInput.trim() || savingIdea) return;
    setSavingIdea(true);
    await handleCaptureIdea(ideaInput);
    setIdeaInput("");
    setSavingIdea(false);
  }, [ideaInput, savingIdea, handleCaptureIdea]);

  // Search disabled until backend endpoint exists — inert state avoids alert()
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
  }, []);

  // Analyze draft disabled until AI analysis endpoint exists
  const handleAnalyzeDraft = useCallback(() => {
    // noop — feature placeholder
  }, []);

  /* ───── Loading / Error / Empty ───── */

  if (isLoading) return <HomeLoading />;
  if (isError) return <HomeError onRetry={handleRetry} />;

  const lastPublishTitle =
    lastPublished && "title" in lastPublished ? lastPublished.title : null;

  const hasSecondary = recentIdeas.length > 0 || lastPublished || recentSources.length > 0;

  /* ───── Render ───── */

  return (
    <div className="mx-auto max-w-4xl">
      {isEmpty ? (
        <HomeEmpty
          onCreateArticle={() => navigate({ to: "/content/articles" })}
          onCreateNewsletter={handleCreateNewsletter}
        />
      ) : (
        <>
          {/* ══════ Hero: greeting + actions + search ══════ */}
          <header className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-[var(--font-display)] text-3xl text-[var(--color-bg-surface)]">
                {greeting}
              </h1>
              <p className="max-w-prose text-sm text-[var(--color-text-secondary)]">
                {t("home.subtitle")}
              </p>
            </div>

            {/* Actions + search in one row */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate({ to: "/content/articles" })}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                <PenLine size={16} />
                {t("home.writeArticle")}
              </button>
              <button
                onClick={handleCreateNewsletter}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5 active:scale-[0.98]"
              >
                <Mail size={16} />
                {t("home.createNewsletter")}
              </button>
              <Link
                to="/content/ideas"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5"
              >
                <Lightbulb size={16} />
                {t("home.captureIdea")}
              </Link>
              <Link
                to="/discover"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5"
              >
                <FileText size={16} />
                {t("home.findReferences")}
              </Link>
              {hasDraftsWithBody && (
                <button
                  onClick={handleAnalyzeDraft}
                  className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-[var(--color-accent-primary)]/20 px-4 py-2 text-sm text-[var(--color-accent-primary)] opacity-50"
                  aria-disabled="true"
                  tabIndex={-1}
                >
                  <Sparkles size={16} />
                  {t("home.analyzeDraft")}
                </button>
              )}
            </div>

            {/* Search — disabled until backend endpoint exists */}
            <form onSubmit={handleSearch} className="relative opacity-60">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                disabled
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("home.searchPlaceholder")}
                className="w-full cursor-not-allowed rounded-lg border border-[var(--color-border)]/15 bg-white/[0.03] py-2.5 pl-9 pr-4 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)]"
              />
            </form>
          </header>

          {/* ══════ AI Insights ══════ */}
          {visibleInsights.length > 0 && (
            <section className="mt-10">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--color-accent-primary)]" />
                <h2 className="text-xs text-[var(--color-text-muted)]">{t("home.insights")}</h2>
              </div>
              <div className="divide-y divide-[var(--color-border)]/10 rounded-lg border border-[var(--color-border)]/10 bg-white/[0.03]">
                {visibleInsights.map((insight) => (
                  <div key={insight.id} className="flex items-center gap-3 px-4 py-3">
                    <InsightIcon icon={insight.icon} />
                    <span className="flex-1 text-sm text-[var(--color-text-secondary)]">
                      {insight.text}
                    </span>
                    <Link
                      to={insight.to}
                      className="shrink-0 text-xs font-medium text-[var(--color-accent-primary)] transition-colors hover:underline"
                    >
                      {insight.actionLabel}
                    </Link>
                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className="shrink-0 cursor-pointer text-[10px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
                      aria-label={t("home.dismissInsight")}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ══════ Continue Writing ══════ */}
          {continueWriting.length > 0 && (
            <section className="mt-14">
              <div className="mb-5 flex items-center gap-3">
                <h2 className="text-xs text-[var(--color-text-muted)]">
                  {t("home.continueWriting")}
                </h2>
                <div className="flex-1 border-t border-[var(--color-border)]/10" />
                <Link
                  to="/content/articles"
                  className="shrink-0 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-primary)]"
                >
                  {t("home.viewAll")}
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {continueWriting.map((item) => (
                  <ContinueCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onClick={() => handleContinueWriting(item)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ══════ Inline idea capture ══════ */}
          <div className="mt-10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleIdeaSubmit();
              }}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)]/10 bg-white/[0.03] px-4 py-3 transition-colors focus-within:border-[var(--color-accent-primary)]/40"
            >
              <Lightbulb size={16} className="shrink-0 text-[var(--color-accent-primary)]" />
              <input
                type="text"
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                placeholder={t("home.ideaPlaceholder")}
                className="flex-1 bg-transparent text-sm text-[var(--color-bg-surface)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
              <button
                type="submit"
                disabled={!ideaInput.trim() || savingIdea}
                className="flex cursor-pointer items-center gap-1 rounded-md bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Plus size={12} />
                {t("editor.add")}
              </button>
            </form>
          </div>

          {/* ══════ Secondary: Ideas + Last Published + Sources ══════ */}
          {hasSecondary && (
            <div className="mt-12 flex flex-wrap gap-8">
              {/* Recent ideas */}
              {recentIdeas.length > 0 && (
                <section className="min-w-[280px] flex-1">
                  <h3 className="mb-3 text-xs text-[var(--color-text-muted)]">
                    {t("home.recentIdeas")}
                  </h3>
                  <div className="divide-y divide-[var(--color-border)]/5">
                    {recentIdeas.map((idea, idx) => (
                      <IdeaItem key={idea.id} idea={idea} index={idx} />
                    ))}
                  </div>
                </section>
              )}

              {/* Recent sources */}
              {recentSources.length > 0 && (
                <section className="min-w-[280px] flex-1">
                  <h3 className="mb-3 text-xs text-[var(--color-text-muted)]">
                    {t("home.recentSources")}
                  </h3>
                  <div className="divide-y divide-[var(--color-border)]/5">
                    {recentSources.map((source) => (
                      <SourceItem key={source.id} source={source} />
                    ))}
                  </div>
                </section>
              )}

              {/* Last published */}
              {lastPublished && (
                <section className="min-w-[280px] flex-1">
                  <h3 className="mb-3 text-xs text-[var(--color-text-muted)]">
                    {t("home.lastPublished")}
                  </h3>
                  <Link
                    to="/library"
                    className="group flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border)]/10 bg-white/5 p-4 transition-colors hover:bg-white/[0.08]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-bg-surface)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {lastPublishTitle || "(no title)"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {"updated_at" in lastPublished
                          ? timeAgo(lastPublished.updated_at, t)
                          : ""}
                      </p>
                    </div>
                    <ExternalLink size={14} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
                  </Link>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
