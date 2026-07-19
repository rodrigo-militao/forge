import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  PenLine,
  Mail,
  Lightbulb,
  Plus,
  FileText,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Zap,
} from "lucide-react";
import { useHomePage, type HomeItem } from "./hooks/use-home-page";
import { formatTimeAgo } from "../../lib/time";
import type { Idea, DigestSource } from "../../api/types";
import { useOutsideClick } from "../../hooks/useOutsideClick";

/* ───── Helpers ───── */

function statusLabel(status: string, t: (k: string) => string): string {
  if (status === "draft") return t("editor.draft");
  if (status === "building") return t("newsletters.building");
  if (status === "review") return t("newsletters.review");
  if (status === "ready") return t("newsletters.ready");
  if (status === "published") return t("editor.published");
  return status;
}

function timeAgo(dateStr: string, t: (k: string, opts?: Record<string, unknown>) => string): string {
  return formatTimeAgo(dateStr, t) || "";
}

function nextActionLabel(nextAction: HomeItem["nextAction"], t: (k: string) => string): string {
  switch (nextAction) {
    case "continue_writing": return t("home.nextActionContinueWriting");
    case "review_draft": return t("home.nextActionReviewDraft");
    case "add_references": return t("home.nextActionAddReferences");
    case "review": return t("home.nextActionReview");
    case "publish": return t("home.nextActionPublish");
  }
}

function InsightIcon({ icon }: { icon: string }) {
  const size = 14;
  const className = "text-[var(--color-text-muted)]";
  switch (icon) {
    case "lightbulb": return <Lightbulb size={size} className={className} />;
    case "fileText": return <FileText size={size} className={className} />;
    case "mail": return <Mail size={size} className={className} />;
    case "sparkles": return <Zap size={size} className={className} />;
    default: return <FileText size={size} className={className} />;
  }
}

/* ───── Section heading ───── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-medium text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-2 mb-4 text-balance">
      {children}
    </h2>
  );
}

/* ───── Continue writing card ───── */

export function ContinueCard({ item, onClick }: { item: HomeItem; onClick: (item: HomeItem) => void }) {
  const { t } = useTranslation();
  const isArticle = item.type === "article";
  const Icon = isArticle ? PenLine : Mail;
  const action = nextActionLabel(item.nextAction, t);

  return (
    <button
      onClick={() => onClick(item)}
      className="group flex flex-col gap-2 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-bg-base)] p-4 text-left transition-all hover:border-[var(--color-border)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
    >
      {/* Type + status */}
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-[var(--color-text-muted)]" />
        <span className="text-xs text-[var(--color-text-muted)]">
          {isArticle ? t("home.typeArticle") : t("home.typeNewsletter")}
        </span>
        <span className="ml-auto text-xs text-[var(--color-text-secondary)]">
          {statusLabel(item.status, t)}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-medium text-[var(--color-bg-surface)] line-clamp-1 break-words">
        {item.title}
      </h3>

      {/* Next action + last edited */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">
          {timeAgo(item.updatedAt, t) && (
            <>
              {t("newsletters.lastEdited")} {timeAgo(item.updatedAt, t)}
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] transition-all group-hover:text-[var(--color-text-secondary)] group-hover:translate-x-0.5">
          {action}
          <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

/* ───── Idea item ───── */

function IdeaItem({ idea }: { idea: Idea }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/content/ideas"
      className="group flex items-center gap-2 rounded-md px-0.5 py-1.5 text-sm text-[var(--color-bg-surface)]/70 transition-colors hover:text-[var(--color-bg-surface)]"
    >
      <Lightbulb size={12} className="shrink-0 text-[var(--color-text-muted)]" />
      <span className="flex-1 truncate">{idea.title || t("ideas.title")}</span>
      <ArrowRight
        size={12}
        className="shrink-0 text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/* ───── Source item ───── */

function SourceItem({ source }: { source: DigestSource }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between px-0.5 py-1">
      <span className="truncate text-sm text-[var(--color-bg-surface)]/70">{source.name}</span>
      <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{timeAgo(source.updated_at, t)}</span>
    </div>
  );
}

/* ───── Last published item ───── */

function LastPublishedItem({ item }: { item: NonNullable<ReturnType<typeof useHomePage>["lastPublished"]> }) {
  const { t } = useTranslation();
  return (
    <Link
      to={item.to}
      className="group flex items-center gap-2 rounded-md px-0.5 py-1.5 text-sm text-[var(--color-bg-surface)]/70 transition-colors hover:text-[var(--color-bg-surface)]"
    >
      <ExternalLink size={12} className="shrink-0 text-[var(--color-text-muted)]" />
      <span className="flex-1 truncate">{item.title}</span>
      <ArrowRight
        size={12}
        className="shrink-0 text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/* ───── Loading state ───── */

export function HomeLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-14">
      {/* Hero skeleton */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="skeleton skeleton-title !w-72" />
          <div className="skeleton skeleton-text !w-96" />
        </div>
        <div className="skeleton !mb-0 !h-9 w-20 rounded-lg" />
      </div>

      {/* Continue writing skeleton */}
      <div>
        <div className="mb-5 skeleton skeleton-text !w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="skeleton !mb-0 !h-28 rounded-lg" />
          <div className="skeleton !mb-0 !h-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/* ───── Error state ───── */

export function HomeError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-sm text-[var(--color-text-muted)]">{t("home.errorLoading")}</p>
        <button
          onClick={onRetry}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)]/60 px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-bg-surface)] hover:border-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
        >
          <RefreshCw size={14} />
          {t("home.tryAgain")}
        </button>
      </div>
    </div>
  );
}

/* ───── Empty state ───── */

export function HomeEmpty({
  onNewArticle,
  onNewNewsletter,
}: {
  onNewArticle: () => void;
  onNewNewsletter: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-4xl space-y-14">
      <header className="space-y-4">
        <h1 className="text-4xl font-[var(--font-display)] text-[var(--color-bg-surface)]">
          {t("home.welcome")}
        </h1>
        <p className="max-w-prose text-sm text-[var(--color-text-secondary)] text-balance">
          {t("home.welcomeDesc")}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("home.welcomeCTA")}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewArticle}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            {t("home.newButton")}
          </button>
        </div>
      </header>
    </div>
  );
}

/* ───── Main page ───── */

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    greeting,
    user,
    continueWriting,
    recentIdeas,
    lastPublished,
    recentSources,
    editorialAttention,
    isLoading,
    isError,
    isEmpty,
    handleContinueWriting,
    handleCreateArticle,
    handleCreateNewsletter,
    handleCreateIdea,
    handleCaptureIdea,
    handleRetry,
  } = useHomePage();

  /* ───── [+ New] dropdown ───── */

  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(newMenuRef, () => setNewMenuOpen(false), newMenuOpen);

  const handleNewArticle = useCallback(() => {
    setNewMenuOpen(false);
    handleCreateArticle();
  }, [handleCreateArticle]);

  const handleNewNewsletter = useCallback(() => {
    setNewMenuOpen(false);
    handleCreateNewsletter();
  }, [handleCreateNewsletter]);

  const handleNewIdea = useCallback(() => {
    setNewMenuOpen(false);
    handleCreateIdea();
  }, [handleCreateIdea]);

  /* ───── Idea capture ───── */

  const [ideaText, setIdeaText] = useState("");

  const handleCaptureIdeaSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ideaText.trim()) return;
      // Use handleCaptureIdea — it accepts the text via the hidden input
      // We'll navigate to ideas page with the text pre-filled
      await handleCaptureIdea(ideaText);
      setIdeaText("");
    },
    [ideaText, handleCaptureIdea],
  );

  /* ───── Early returns ───── */

  if (isLoading) return <HomeLoading />;
  if (isError) return <HomeError onRetry={handleRetry} />;
  if (isEmpty) return <HomeEmpty onNewArticle={handleNewArticle} onNewNewsletter={handleNewNewsletter} />;

  /* ───── Render ───── */

  return (
    <div className="mx-auto max-w-4xl space-y-14">
      {/* ── Header ── */}
      <header className="space-y-4">
        <h1 className="text-4xl font-[var(--font-display)] text-[var(--color-bg-surface)] text-balance">
          {greeting}
        </h1>
        <p className="max-w-prose text-sm text-[var(--color-text-secondary)]">
          {t("home.subtitle")}
        </p>

        <div className="flex items-center gap-2">
          {/* [+ New] button + dropdown */}
          <div ref={newMenuRef} className="relative">
            <button
              onClick={() => setNewMenuOpen((prev) => !prev)}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)]"
            >
              <Plus size={16} />
              {t("home.newButton")}
            </button>

            {newMenuOpen && (
              <div className="absolute left-0 top-10 z-50 w-44 overflow-hidden rounded-lg border border-[var(--color-border)]/30 bg-[var(--color-bg-surface-elevated)]">
                <button
                  onClick={handleNewArticle}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--color-bg-surface)]/80 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:bg-white/5"
                >
                  <PenLine size={14} className="text-[var(--color-text-muted)]" />
                  <div>
                    <div>{t("home.newArticle")}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{t("home.newArticleDesc")}</div>
                  </div>
                </button>
                <div className="mx-3 h-px bg-[var(--color-border)]/20" />
                <button
                  onClick={handleNewNewsletter}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--color-bg-surface)]/80 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:bg-white/5"
                >
                  <Mail size={14} className="text-[var(--color-text-muted)]" />
                  <div>
                    <div>{t("home.newNewsletter")}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{t("home.newNewsletterDesc")}</div>
                  </div>
                </button>
                <div className="mx-3 h-px bg-[var(--color-border)]/20" />
                <button
                  onClick={handleNewIdea}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--color-bg-surface)]/80 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:bg-white/5"
                >
                  <Lightbulb size={14} className="text-[var(--color-text-muted)]" />
                  <div>
                    <div>{t("home.newIdea")}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{t("home.newIdeaDesc")}</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Editorial Attention ── */}
      {editorialAttention.length > 0 && (
        <section className="space-y-3">
          <SectionHeading>{t("home.editorialAttention")}</SectionHeading>
          <div className="space-y-2">
            {editorialAttention.map((insight) => (
              <div
                key={insight.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border)]/20 px-4 py-3"
              >
                <InsightIcon icon={insight.icon} />
                <p className="flex-1 text-sm text-[var(--color-bg-surface)]/80">{insight.text}</p>
                <Link
                  to={insight.to}
                  className="shrink-0 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-bg-surface)]"
                >
                  {insight.actionLabel} →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Continue Writing ── */}
      {continueWriting.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeading>{t("home.continueWriting")}</SectionHeading>
            <Link
              to="/content/newsletters"
              className="text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-bg-surface)]"
            >
              {t("home.viewAll")} →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {continueWriting.map((item) => (
              <ContinueCard key={`${item.type}-${item.id}`} item={item} onClick={handleContinueWriting} />
            ))}
          </div>
        </section>
      )}

      {/* ── Capture idea ── */}
      <form onSubmit={handleCaptureIdeaSubmit} className="mx-auto max-w-md">
        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)]/20 px-4 py-2.5 transition-colors focus-within:border-[var(--color-border)]/50">
          <Lightbulb size={14} className="text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            placeholder={t("home.ideaPlaceholder")}
            aria-label={t("home.ideaPlaceholder")}
            maxLength={200}
            className="flex-1 bg-transparent text-sm text-[var(--color-bg-surface)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
        </div>
      </form>

      {/* ── Secondary sections ── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {/* Recent ideas */}
        {recentIdeas.length > 0 && (
          <div className="space-y-3">
            <SectionHeading>{t("home.recentIdeas")}</SectionHeading>
            <div className="space-y-1">
              {recentIdeas.slice(0, 3).map((idea) => (
                <IdeaItem key={idea.id} idea={idea} />
              ))}
            </div>
          </div>
        )}

        {/* Recent sources */}
        {recentSources.length > 0 && (
          <div className="space-y-3">
            <SectionHeading>{t("home.recentSources")}</SectionHeading>
            <div className="divide-y divide-[var(--color-border)]/10">
              {recentSources.slice(0, 5).map((source) => (
                <SourceItem key={source.id} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* Last published */}
        {lastPublished && (
          <div className="space-y-3">
            <SectionHeading>{t("home.lastPublished")}</SectionHeading>
            <LastPublishedItem item={lastPublished} />
          </div>
        )}
      </div>
    </div>
  );
}
