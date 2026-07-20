import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, MoreHorizontal, Archive, Copy, Send, CheckCircle, CheckCircle2, ArrowRight } from "lucide-react";
import type { NewsletterEdition } from "../../../api/client";

interface WorkspaceHeaderProps {
  edition: NewsletterEdition;
  isSynced: boolean;
  isSaving: boolean;
  saveError: string | null;
  onBack: () => void;
  onStatusChange: (status: string) => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onUnarchive?: () => void;
}

export function WorkspaceHeader({
  edition,
  isSynced,
  isSaving,
  saveError,
  onBack,
  onStatusChange,
  onDuplicate,
  onArchive,
  onUnarchive,
}: WorkspaceHeaderProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [showSyncCheck, setShowSyncCheck] = useState(false);
  const wasSyncedRef = useRef(isSynced);

  useEffect(() => {
    if (isSynced && !wasSyncedRef.current) {
      setLastSyncedAt(new Date());
      setShowSyncCheck(true);
      const timer = setTimeout(() => setShowSyncCheck(false), 1200);
      return () => clearTimeout(timer);
    }
    wasSyncedRef.current = isSynced;
  }, [isSynced]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSyncedAt) return;
    const id = setInterval(() => setTick((v) => v + 1), 10_000);
    return () => clearInterval(id);
  }, [lastSyncedAt]);

  function formatTimeAgo(date: Date): string {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 10) return t("newsletters.justNow");
    if (secs < 60) return t("newsletters.secondsAgo", { count: secs });
    const mins = Math.floor(secs / 60);
    if (mins < 60) return t("newsletters.minutesAgo", { count: mins });
    return t("newsletters.hoursAgo", { count: Math.floor(mins / 60) });
  }

  const needsReview = edition.status === "building" && edition.article_count > 0 && edition.body_html.length > 0;
  const isReady = edition.status === "ready";

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2">
      {/* Left: back + sync */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1 text-sm text-[var(--color-text-muted)] transition-all hover:text-[var(--color-bg-surface)] active:scale-[0.95]"
          aria-label={t("newsletters.backToNewsletters")}
        >
          <ChevronLeft size={16} />
        </button>

        {isSaving && (
          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]" role="status" aria-live="polite">
            <span className="inline-block h-2 w-2 rounded-full border border-[var(--color-text-muted)]/40 border-t-current animate-spin" />
            {t("newsletters.saving")}
          </span>
        )}
        {saveError && (
          <span className="text-xs text-[var(--color-accent-danger)]" role="alert">{saveError}</span>
        )}
        {lastSyncedAt && !isSaving && !saveError && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]/50" aria-live="polite">
            <CheckCircle2
              size={12}
              className={`text-[var(--color-accent-success)] transition-all duration-500 ${
                showSyncCheck
                  ? "scale-100 opacity-100"
                  : "scale-50 opacity-0"
              }`}
            />
            {t("newsletters.saved")} {formatTimeAgo(lastSyncedAt)}
          </span>
        )}
      </div>

      {/* Right: Review CTA + menu */}
      <div className="flex shrink-0 items-center gap-1.5">
        {needsReview && (
          <button
            onClick={() => onStatusChange("review")}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/15 px-3 py-1.5 text-xs font-medium text-[var(--color-accent-primary)] transition-all hover:scale-[1.02] hover:bg-[var(--color-accent-primary)]/25 active:scale-[0.97]"
          >
            <Send size={13} />
            <span className="hidden sm:inline">{t("newsletters.sendForReview")}</span>
            <ArrowRight size={12} />
          </button>
        )}
        {isReady && (
          <button
            onClick={() => onStatusChange("published")}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-all hover:scale-[1.02] hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
          >
            <CheckCircle size={13} />
            <span className="hidden sm:inline">{t("newsletters.markAsReady")}</span>
            <ArrowRight size={12} />
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex cursor-pointer items-center justify-center rounded-lg px-2 py-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
            aria-label={t("newsletters.moreActions")}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-bg-base)] py-1 shadow-xl"
                role="menu"
              >
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onDuplicate(); }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] transition-colors hover:bg-white/10"
                >
                  <Copy size={13} />
                  {t("newsletters.duplicate")}
                </button>
                {edition.status === "archived" && onUnarchive ? (
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); onUnarchive(); }}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/10"
                  >
                    <Copy size={13} />
                    {t("newsletters.unarchiveAction")}
                  </button>
                ) : (
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); onArchive(); }}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-accent-danger)] transition-colors hover:bg-[var(--color-accent-danger)]/10"
                  >
                    <Archive size={13} />
                    {t("newsletters.archiveAction")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
