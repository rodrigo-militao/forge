import { useTranslation } from "react-i18next";
import { Archive, Copy, Edit3, Eye } from "lucide-react";
import type { NewsletterEdition } from "../../../api/client";
import { formatTimeAgo } from "../../digest/components/stats-bar";

interface NewsletterListCardProps {
  item: NewsletterEdition;
  isSelected: boolean;
  onClick: (item: NewsletterEdition) => void;
  onEdit: (item: NewsletterEdition) => void;
  onDuplicate: (item: NewsletterEdition) => void;
  onPreview: (item: NewsletterEdition) => void;
  onArchive: (item: NewsletterEdition) => void;
}

const statusConfig: Record<string, { labelKey: string; className: string }> = {
  building: { labelKey: "newsletters.building", className: "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]" },
  ready: { labelKey: "newsletters.ready", className: "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]" },
  published: { labelKey: "newsletters.published", className: "bg-white/10 text-[var(--color-bg-surface)]" },
  archived: { labelKey: "newsletters.archived", className: "bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]" },
};

const TARGET_ARTICLE_COUNT = 8;

export function NewsletterListCard({ item, isSelected, onClick, onEdit, onDuplicate, onPreview, onArchive }: NewsletterListCardProps) {
  const { t } = useTranslation();
  const cfg = statusConfig[item.status] ?? statusConfig.building;

  return (
    <div
      onClick={() => onClick(item)}
      className={`group cursor-pointer rounded-xl border p-4 text-left transition-all duration-[var(--duration-base)] ${
        isSelected
          ? "border-[var(--color-accent-primary)]/50 bg-white/[0.08] ring-2 ring-[var(--color-accent-primary)]/25 shadow-lg shadow-[var(--color-accent-primary)]/8"
          : "border-[var(--color-border)]/10 bg-white/[0.02] hover:border-[var(--color-accent-primary)]/25 hover:bg-white/[0.05] hover:shadow-md hover:shadow-black/5"
      }`}
    >
      {/* Top row: title + status badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-medium text-[var(--color-bg-surface)]">
          {item.title || t("newsletters.noTitle")}
        </h3>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}>
          {t(cfg.labelKey)}
        </span>
      </div>

      {/* Destination */}
      {item.destination && (
        <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{item.destination}</p>
      )}

      {/* Article count + progress bar */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-xs text-[var(--color-bg-surface)]/70">
          {t("newsletters.article", { count: item.article_count })}
        </span>
        {item.article_count > 0 && (
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

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--color-accent-primary)]/15 px-1.5 py-0.5 text-[10px] text-[var(--color-accent-primary)]"
            >
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">+{item.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Bottom row: timestamp + actions */}
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {t("newsletters.lastEdited")} {formatTimeAgo(item.updated_at, t)}
        </span>
        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            data-tooltip={t("editor.edit")}
            aria-label={t("editor.edit")}
            className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-accent-primary)]"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(item); }}
            data-tooltip={t("newsletters.preview")}
            aria-label={t("newsletters.preview")}
            className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(item); }}
            data-tooltip={t("newsletters.duplicate")}
            aria-label={t("newsletters.duplicate")}
            className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-accent-primary)]"
          >
            <Copy size={13} />
          </button>
          {item.status !== "archived" && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(item); }}
              data-tooltip={t("newsletters.archiveAction")}
              aria-label={t("newsletters.archiveAction")}
              className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-danger)]/15 hover:text-[var(--color-accent-danger)]"
            >
              <Archive size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
