import { useTranslation } from "react-i18next";
import { X, Plus } from "lucide-react";
import type { ContentItem } from "../../../api/client";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function estimateReadTime(text: string | null): number {
  if (!text) return 1;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

interface DetailPanelProps {
  item: ContentItem;
  isSelected: boolean;
  isUsed: boolean;
  onClose: () => void;
  onToggleSelect: (id: string) => void;
  onAddToNewsletter: (id: string, e: React.MouseEvent) => void;
}

export function DetailPanel({
  item,
  isSelected,
  isUsed,
  onClose,
  onToggleSelect,
  onAddToNewsletter,
}: DetailPanelProps) {
  const { t } = useTranslation();
  const sourceUrl = (item.metadata?.source_url as string) ?? "";
  const domain = sourceUrl ? extractDomain(sourceUrl) : "";
  const readTime = estimateReadTime(item.body_markdown);

  return (
    <div className="flex w-[400px] shrink-0 flex-col max-h-[75vh] rounded-lg border border-l-0 border-[var(--color-border)]/20 bg-white/5 shadow-[-4px_0_12px_rgba(0,0,0,0.12)]">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Status + Close */}
        <div className="mb-4 flex items-center justify-between">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              isUsed
                ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]"
                : "bg-white/10 text-[var(--color-text-muted)]"
            }`}
          >
            {isUsed ? t("digest.detailUsed") : t("digest.detailNew")}
          </span>
          <button
            onClick={onClose} aria-label="Close detail panel"
            className="cursor-pointer rounded-md p-1 text-[var(--color-text-muted)] transition-all hover:bg-white/10 hover:text-[var(--color-bg-surface)] active:scale-[0.92]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Title */}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-[var(--font-display)] text-xl font-bold leading-tight text-[var(--color-bg-surface)] transition-colors hover:text-[var(--color-accent-primary)] break-words"
        >
          {item.title || "(no title)"}
        </a>

        {/* Source + Read time */}
        <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          {domain && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[var(--color-accent-primary)]">
              {domain}
            </a>
          )}
          {domain && <span>·</span>}
          <span>{t("digest.detailReadTime", { n: readTime })}</span>
        </div>

        {/* Summary */}
        {item.body_markdown && (
          <section className="mt-5">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {t("digest.detailSummary")}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]/90">
              {item.body_markdown.length > 300
                ? item.body_markdown.slice(0, 300) + "..."
                : item.body_markdown}
            </p>
          </section>
        )}

        {(item.categories?.length || item.tags?.length) && (
          <div className="mt-5 border-t border-[var(--color-border)]/10" />
        )}

        {/* Categories section — orange badges */}
        {item.categories && item.categories.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {t("digest.detailCategories")}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {item.categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-full bg-[var(--color-accent-primary)]/20 px-2.5 py-1 text-xs font-medium text-[var(--color-accent-primary)]"
                >
                  {cat}
                </span>
              ))}
            </div>
          </section>
        )}

        {item.categories?.length && item.tags?.length && (
          <div className="mt-5 border-t border-[var(--color-border)]/10" />
        )}

        {/* Tags section — muted monospace with #, visually distinct from categories */}
        {item.tags && item.tags.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {t("digest.detailTags")}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-white/10 px-2 py-1 font-mono text-xs text-[var(--color-text-muted)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Fixed footer */}
      <div className="shrink-0 border-t border-[var(--color-border)]/20 px-4 py-3">
        <div className="flex flex-row gap-2">
          <button
            onClick={() => onToggleSelect(item.id)}
            className={`flex-1 cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.97] ${
              isSelected
                ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
                : "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/10"
            }`}
          >
            {isSelected
              ? t("digest.detailMarkAsSelected") + " ✓"
              : t("digest.detailMarkAsSelected")}
          </button>
          <button
            onClick={(e) => onAddToNewsletter(item.id, e)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
          >
            <Plus size={14} />
            {t("digest.detailAddToNewsletter")}
          </button>
        </div>
      </div>
    </div>
  );
}
