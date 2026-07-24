import { useTranslation } from "react-i18next";
import { Archive, Copy, Edit3, Eye } from "lucide-react";
import type { NewsletterEdition } from "../../../api/client";
import { formatTimeAgo } from "../../../lib/time";

interface NewsletterListCardProps {
  item: NewsletterEdition;
  isSelected: boolean;
  onClick: (item: NewsletterEdition) => void;
  onEdit: (item: NewsletterEdition) => void;
  onDuplicate: (item: NewsletterEdition) => void;
  onPreview: (item: NewsletterEdition) => void;
  onArchive: (item: NewsletterEdition) => void;
}

const statusMeta: Record<string, { labelKey: string; dot: string }> = {
  building: { labelKey: "newsletters.building", dot: "bg-[var(--color-accent-primary)]" },
  ready: { labelKey: "newsletters.ready", dot: "bg-[var(--color-accent-success)]" },
  published: { labelKey: "newsletters.published", dot: "bg-[var(--color-bg-surface)]" },
  archived: { labelKey: "newsletters.archived", dot: "bg-[var(--color-text-muted)]" },
};

function stageProgress(item: NewsletterEdition): number {
  if (item.status === "published" || item.status === "archived") return 100;
  if (item.status === "ready") return 75;
  if (item.article_count > 0) return 50;
  return 25;
}

export function NewsletterListCard({ item, isSelected, onClick, onEdit, onDuplicate, onPreview, onArchive }: NewsletterListCardProps) {
  const { t } = useTranslation();
  const meta = statusMeta[item.status] ?? statusMeta.building;
  const pct = stageProgress(item);

  return (
    <div
      onClick={() => onClick(item)}
      className={`group cursor-pointer border-b border-[var(--color-border)]/10 py-3 text-left transition-all duration-[var(--duration-base)] ${
        isSelected
          ? "bg-white/[0.06]"
          : "bg-transparent hover:bg-white/[0.03]"
      }`}
    >
      {/* Top row: status dot + name (left) | compact progress bar (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
            {t(meta.labelKey)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-[var(--color-accent-primary)] transition-all duration-[var(--duration-base)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-medium tabular-nums text-[var(--color-text-muted)]">{pct}%</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-1.5 min-w-0 truncate text-sm font-medium text-[var(--color-bg-surface)]">
        {item.title || t("newsletters.noTitle")}
      </h3>

      {/* Destination */}
      {item.destination && (
        <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{item.destination}</p>
      )}

      {/* Metadata: last edited | article count */}
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
        <span>{formatTimeAgo(item.updated_at, t)}</span>
        <span className="text-[var(--color-text-muted)]/30">|</span>
        <span>
          {item.article_count}{" "}
          {item.article_count === 1 ? t("newsletters.article") : t("newsletters.articles")}
        </span>
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {item.tags.slice(0, 3).map((tag, ti) => (
            <span key={tag} className="flex items-center gap-1">
              {ti > 0 && <span className="text-xs text-[var(--color-text-muted)]">·</span>}
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                #{tag}
              </span>
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">+{item.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Bottom row: actions */}
      <div className="mt-2.5 flex items-center justify-end">
        <div className="flex items-center gap-1 opacity-40 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100 group-focus-within:opacity-100">
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
