import { useTranslation } from "react-i18next";
import { ArrowRight, ExternalLink, Edit3, Eye, ClipboardList, Archive, Copy } from "lucide-react";
import type { NewsletterEdition } from "../../../api/client";

interface DetailPanelCtaProps {
  stage: string;
  item: NewsletterEdition;
  articles: { content_id: string }[];
  generating: boolean;
  allChecksPass: boolean;
  onStatusChange: (s: string) => void;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: (item: NewsletterEdition) => void;
  onArchive: (item: NewsletterEdition) => void;
  onUnarchive: () => void;
  onNavigateToDiscover: () => void;
  onContinueToCompose: () => void;
}

export function DetailPanelCta({
  stage,
  item,
  articles,
  generating,
  allChecksPass,
  onStatusChange,
  onEdit,
  onPreview,
  onDuplicate,
  onArchive,
  onUnarchive,
  onNavigateToDiscover,
  onContinueToCompose,
}: DetailPanelCtaProps) {
  const { t } = useTranslation();

  switch (stage) {
    case "discover":
      if (articles.length > 0) {
        return (
          <button
            onClick={onContinueToCompose}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent-primary)]/20 transition-all hover:bg-[var(--color-accent-primary)]/90 hover:shadow-lg hover:shadow-[var(--color-accent-primary)]/25 active:scale-[0.97]"
          >
            {t("newsletters.continueToCompose")}
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        );
      }
      return (
        <button
          onClick={onNavigateToDiscover}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/20 active:scale-[0.97]"
        >
          <ExternalLink size={15} />
          {t("newsletters.discoverWeb")}
        </button>
      );

    case "compose":
      if (allChecksPass && !generating) {
        return (
          <button
            onClick={() => onStatusChange("review")}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-success)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent-success)]/20 transition-all hover:bg-[var(--color-accent-success)]/90 hover:shadow-lg hover:shadow-[var(--color-accent-success)]/25 active:scale-[0.97]"
          >
            <ClipboardList size={16} />
            {t("newsletters.sendForReview")}
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        );
      }
      return (
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
          >
            <Edit3 size={15} />
            {t("newsletters.continueEditing")}
          </button>
          <button
            onClick={onPreview}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-border)]/20 px-4 py-2.5 text-sm text-[var(--color-bg-surface)] transition-all hover:bg-white/10 active:scale-[0.97]"
          >
            <Eye size={15} />
            {t("newsletters.preview")}
          </button>
        </div>
      );

    case "ready":
      return (
        <button
          onClick={() => onStatusChange("published")}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent-primary)]/20 transition-all hover:bg-[var(--color-accent-primary)]/90 hover:shadow-lg hover:shadow-[var(--color-accent-primary)]/25 active:scale-[0.97]"
        >
          <Eye size={16} />
          {t("newsletters.markAsPublished")}
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      );

    case "published":
      return (
        <div className="flex gap-2">
          <button
            onClick={() => onDuplicate(item)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
          >
            <Copy size={15} />
            {t("newsletters.createNextEdition")}
          </button>
          <button
            onClick={() => onArchive(item)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-accent-danger)]/30 px-4 py-2.5 text-sm text-[var(--color-accent-danger)] transition-all hover:bg-[var(--color-accent-danger)]/10 active:scale-[0.97]"
          >
            <Archive size={15} />
          </button>
        </div>
      );

    case "archived":
      return (
        <button
          onClick={onUnarchive}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/20 active:scale-[0.97]"
        >
          {t("newsletters.unarchiveAction")}
        </button>
      );

    default:
      return null;
  }
}
