import { useTranslation } from "react-i18next";
import { Archive, ChevronLeft, Copy, Edit3, Sparkles } from "lucide-react";
import type { NewsletterEdition } from "../../../api/client";
import { api } from "../../../api/client";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/queryKeys";

interface PreviewOverlayProps {
  item: NewsletterEdition;
  onClose: () => void;
  onEdit: (item: NewsletterEdition) => void;
  onArchive: (item: NewsletterEdition) => void;
  onPublished?: (item: NewsletterEdition) => void;
}

export function PreviewOverlay({ item, onClose, onEdit, onArchive, onPublished }: PreviewOverlayProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 pt-12 pb-12"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-3xl space-y-4 animate-[fadeIn_300ms_ease-out_forwards]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="group cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
          >
            <ChevronLeft size={16} />
            {t("newsletters.backToList")}
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(item)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)]/20 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
              data-tooltip={t("editor.edit")}
              aria-label={t("editor.edit")}
            >
              <Edit3 size={14} />
              <span className="hidden sm:inline">{t("editor.edit")}</span>
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(item.body_html || "");
                  toast.success(t("newsletters.copiedToClipboard"));
                } catch {
                  toast.error(t("newsletters.failed"));
                }
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)]/20 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
              data-tooltip={t("newsletters.copyAsHtml")}
              aria-label={t("newsletters.copyAsHtml")}
            >
              <Copy size={14} />
              <span className="hidden sm:inline">{t("newsletters.copyAsHtml")}</span>
            </button>
            {item.status !== "archived" && (
              <button
                onClick={() => onArchive(item)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)]/20 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent-danger)]/30 hover:bg-[var(--color-accent-danger)]/10 hover:text-[var(--color-accent-danger)]"
                data-tooltip={t("newsletters.archiveAction")}
                aria-label={t("newsletters.archiveAction")}
              >
                <Archive size={14} />
                <span className="hidden sm:inline">{t("newsletters.archiveAction")}</span>
              </button>
            )}
            {item.status === "ready" && (
              <button
                onClick={async () => {
                  try {
                    await api.newsletters.updateStatus(item.id, "published");
                    queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
                    toast.success(t("newsletters.markAsPublished"));
                    onPublished?.(item);
                    onClose();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
                  }
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">{t("newsletters.markAsPublished")}</span>
              </button>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-bg-base)] p-6">
          <h1 className="mb-2 font-[var(--font-display)] text-2xl font-semibold text-[var(--color-bg-surface)]">
            {item.title || t("newsletters.noTitle")}
          </h1>
          {item.destination && (
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">
              {t("newsletters.destination")}: {item.destination}
            </p>
          )}
          <div
            className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--color-bg-surface)]/90 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_a]:text-[var(--color-accent-primary)] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: item.body_html }}
          />
        </div>
      </div>
    </div>
  );
}
