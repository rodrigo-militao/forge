import { useDraggable } from "@dnd-kit/core";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NewsletterEdition } from "../../../api/client";
import { formatTimeAgo } from "../../digest/components/stats-bar";

interface NewsletterCardProps {
  item: NewsletterEdition;
  isSelected: boolean;
  onClick: (item: NewsletterEdition) => void;
  onNextStep: (item: NewsletterEdition) => void;
}

type NextStep = {
  label: string;
  kind: "compose" | "review" | "publish" | "done";
};

function getNextStep(item: NewsletterEdition, t: (key: string) => string): NextStep {
  if (item.status === "building") {
    if (item.article_count <= 0) {
      return { label: t("newsletters.selectArticles"), kind: "compose" };
    }
    if (!item.body_html || item.body_html.length === 0) {
      return { label: t("newsletters.continueWriting"), kind: "compose" };
    }
    return { label: t("newsletters.sendForReview"), kind: "review" };
  }
  if (item.status === "ready") {
    return { label: t("newsletters.previewAndPublish"), kind: "publish" };
  }
  return { label: t("newsletters.published"), kind: "done" };
}

const TARGET_ARTICLE_COUNT = 8;

export function NewsletterCard({ item, isSelected, onClick, onNextStep }: NewsletterCardProps) {
  const { t } = useTranslation();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${item.id}`,
    data: { editionId: item.id, status: item.status },
  });

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 100 }
    : undefined;

  const hasArticles = item.article_count > 0;
  const hasBody = item.body_html.length > 0;
  const needsAttention = item.status === "building" && hasArticles && hasBody;
  const nextStep = getNextStep(item, t);

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
      onClick={() => onClick(item)}
      className={`group cursor-grab rounded-lg border p-3.5 text-left transition-all duration-[var(--duration-base)] active:cursor-grabbing ${
        isDragging
          ? "z-50 border-[var(--color-accent-primary)]/40 bg-white/[0.08] opacity-60 shadow-xl ring-1 ring-[var(--color-accent-primary)]/30"
          : isSelected
            ? "border-[var(--color-accent-primary)]/40 bg-white/[0.06] ring-1 ring-[var(--color-accent-primary)]/20"
            : needsAttention
              ? "border-l-2 border-l-[var(--color-accent-primary)]/60 border-[var(--color-border)]/10 bg-white/[0.02] hover:border-[var(--color-accent-primary)]/20"
              : "border-[var(--color-border)]/10 bg-white/[0.02] hover:border-[var(--color-accent-primary)]/20"
      }`}
    >
      {/* Title + needs review badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-medium text-[var(--color-bg-surface)]">
          {item.title || t("newsletters.noTitle")}
        </h3>
        {needsAttention && (
          <span className="shrink-0 rounded-full bg-[var(--color-accent-primary)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent-primary)] whitespace-nowrap">
            {t("newsletters.needsReview")}
          </span>
        )}
      </div>

      {item.destination && (
        <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{item.destination}</p>
      )}

      {/* Article count + progress */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-[var(--color-bg-surface)]/70">
          {t("newsletters.article", { count: item.article_count })}
        </span>
        {hasArticles && (
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-[var(--color-accent-primary)] transition-all duration-[var(--duration-base)]"
                style={{ width: `${Math.min(100, (item.article_count / TARGET_ARTICLE_COUNT) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {Math.min(item.article_count, TARGET_ARTICLE_COUNT)}/{TARGET_ARTICLE_COUNT}
            </span>
          </div>
        )}
      </div>

      {/* Last edited */}
      <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
        {t("newsletters.lastEdited")} {formatTimeAgo(item.updated_at, t)}
      </p>

      {/* Next-step CTA */}
      {nextStep.kind !== "done" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNextStep(item);
          }}
          className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-[var(--duration-fast)] active:scale-[0.97] ${
            nextStep.kind === "review"
              ? "border border-[var(--color-accent-primary)]/40 bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/25"
              : nextStep.kind === "publish"
                ? "bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary)]/90"
                : "border border-[var(--color-border)]/20 text-[var(--color-bg-surface)]/80 hover:bg-white/[0.06] hover:text-[var(--color-bg-surface)]"
          }`}
        >
          {nextStep.label}
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}
