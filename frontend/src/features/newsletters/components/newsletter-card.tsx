import { useDraggable } from "@dnd-kit/core";
import { Edit3, Eye, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NewsletterEdition } from "../../../api/client";
import { formatTimeAgo } from "../../digest/components/stats-bar";

interface NewsletterCardProps {
  item: NewsletterEdition;
  isSelected: boolean;
  onClick: (item: NewsletterEdition) => void;
  onEdit: (item: NewsletterEdition) => void;
  onPreview: (item: NewsletterEdition) => void;
  onDuplicate: (item: NewsletterEdition) => void;
}

const TARGET_ARTICLE_COUNT = 8;

function stripHtml(html: string): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? "";
}

function snippet(bodyHtml: string, max = 90): string {
  const text = stripHtml(bodyHtml).trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export function NewsletterCard({ item, isSelected, onClick, onEdit, onPreview, onDuplicate }: NewsletterCardProps) {
  const { t } = useTranslation();

  // Draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${item.id}`,
    data: { editionId: item.id, status: item.status },
  });

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 100 }
    : undefined;

  const hasArticles = item.article_count > 0;
  const hasDestination = item.destination != null && item.destination !== "";
  const hasBody = item.body_html.length > 0;
  const bodySnippet = snippet(item.body_html);

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
      onClick={() => onClick(item)}
      className={`cursor-grab rounded-lg border p-3.5 text-left transition-all duration-[var(--duration-base)] active:cursor-grabbing ${
        isDragging
          ? "z-50 border-[var(--color-accent-primary)]/40 bg-white/[0.08] opacity-60 shadow-xl ring-1 ring-[var(--color-accent-primary)]/30"
          : isSelected
            ? "border-[var(--color-accent-primary)]/40 bg-white/[0.06] ring-1 ring-[var(--color-accent-primary)]/20"
            : "border-[var(--color-border)]/10 bg-white/[0.02] hover:border-[var(--color-accent-primary)]/20"
      }`}
    >
      {/* Row 1: Release title */}
      <h3 className="truncate text-sm font-medium text-[var(--color-bg-surface)]">
        {item.title || "(no title)"}
      </h3>
      {item.destination && (
        <p className="truncate text-[11px] text-[var(--color-text-muted)]">{item.destination}</p>
      )}

      {/* Checklist */}
      <div className="mt-2.5 space-y-1">
        {/* Articles */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className={`shrink-0 ${hasArticles ? "text-[var(--color-accent-success)]" : "text-[var(--color-text-muted)]"}`}>
            {hasArticles ? "✓" : "○"}
          </span>
          <span className="text-[var(--color-bg-surface)]/70">
            {hasArticles ? `${item.article_count} article${item.article_count !== 1 ? "s" : ""} linked` : "No articles linked"}
          </span>
          {hasArticles && (
            <div className="ml-auto flex items-center gap-1.5">
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

        {/* Destination */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className={`shrink-0 ${hasDestination ? "text-[var(--color-accent-success)]" : "text-[var(--color-text-muted)]"}`}>
            {hasDestination ? "✓" : "○"}
          </span>
          <span className="text-[var(--color-bg-surface)]/70">
            {hasDestination ? `Destination: ${item.destination}` : "No destination set"}
          </span>
        </div>

        {/* Body */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className={`shrink-0 ${hasBody ? "text-[var(--color-accent-success)]" : "text-[var(--color-text-muted)]"}`}>
            {hasBody ? "✓" : "○"}
          </span>
          <span className="text-[var(--color-bg-surface)]/70">
            {hasBody ? "Body content written" : "No body content"}
          </span>
        </div>
      </div>

      {/* Body snippet */}
      {bodySnippet && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">{bodySnippet}</p>
      )}

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
          <span>Updated {formatTimeAgo(item.updated_at, t)}</span>
        </div>
        <div className="flex gap-0.5 opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
            title="Edit"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(item); }}
            className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
            title="Preview"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(item); }}
            className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
            title="Duplicate"
          >
            <Copy size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
