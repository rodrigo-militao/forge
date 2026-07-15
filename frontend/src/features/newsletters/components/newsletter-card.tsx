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

const statusConfig: Record<string, { label: string; className: string }> = {
  building: {
    label: "Building",
    className: "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]",
  },
  ready: {
    label: "Ready",
    className: "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]",
  },
  published: {
    label: "Published",
    className: "bg-white/10 text-[var(--color-bg-surface)]",
  },
  archived: {
    label: "Archived",
    className: "bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]",
  },
};

export function NewsletterCard({ item, isSelected, onClick, onEdit, onPreview, onDuplicate }: NewsletterCardProps) {
  const { t } = useTranslation();
  const cfg = statusConfig[item.status] ?? statusConfig.building;

  return (
    <button
      onClick={() => onClick(item)}
      className={`group w-full cursor-pointer rounded-lg border p-4 text-left transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:bg-white/[0.06] active:translate-y-0 ${
        isSelected
          ? "border-[var(--color-accent-primary)]/40 bg-white/[0.06] ring-1 ring-[var(--color-accent-primary)]/20"
          : "border-[var(--color-border)]/10 bg-white/[0.02] hover:border-[var(--color-accent-primary)]/20 hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
      }`}
    >
      {/* Row 1: title + status badge */}
      <div className="flex items-center gap-2">
        <h3 className="truncate font-medium text-[var(--color-bg-surface)]">
          {item.title || "(no title)"}
        </h3>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${cfg.className}`}>
          {cfg.label}
        </span>
      </div>

      {/* Row 2: metadata — articles, updated, destination */}
      {item.article_count > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
          <span>{item.article_count} {item.article_count === 1 ? "article" : "articles"}</span>
          <span>Updated {formatTimeAgo(item.updated_at, t)}</span>
          {item.destination && (
            <span className="truncate max-w-[160px]">{item.destination}</span>
          )}
        </div>
      )}

      {/* Row 3: tags */}
      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--color-accent-primary)]/20 px-2 py-0.5 text-[10px] text-[var(--color-accent-primary)]"
            >
              {tag}
            </span>
          ))}
          {item.tags.length > 4 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">+{item.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Row 4: quick actions (shown on hover) */}
      <div className="mt-2 flex gap-1 opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          title="Edit"
        >
          <Edit3 size={12} /> Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(item); }}
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          title="Preview"
        >
          <Eye size={12} /> Preview
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(item); }}
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          title="Duplicate"
        >
          <Copy size={12} /> Duplicate
        </button>
      </div>
    </button>
  );
}
