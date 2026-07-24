import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Trash2, X, Check, PenLine, Lightbulb } from "lucide-react";
import type { ContentItem } from "../../../api/client";
import { formatTimeAgo } from "../../../lib/time";
import { useOutsideClick } from "../../../hooks/useOutsideClick";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface ArticleCardProps {
  item: ContentItem;
  isSelected: boolean;
  isUsed: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAddToNewsletter: (id: string, e: React.MouseEvent) => void;
  onClick: (id: string) => void;
  onCreateArticle: (item: ContentItem) => void;
  onCreateIdea: (item: ContentItem) => void;
}

export function ArticleCard({
  item,
  isSelected,
  isUsed,
  onToggleSelect,
  onDelete,
  onAddToNewsletter,
  onClick,
  onCreateArticle,
  onCreateIdea,
}: ArticleCardProps) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteRef = React.useRef<HTMLDivElement>(null);

  // Close delete confirm on outside click or Escape
  useOutsideClick(deleteRef, () => setShowDeleteConfirm(false), showDeleteConfirm);
  React.useEffect(() => {
    if (!showDeleteConfirm) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDeleteConfirm(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showDeleteConfirm]);

  const sourceUrl = (item.metadata?.source_url as string) ?? "";
  const domain = sourceUrl ? extractDomain(sourceUrl) : "";

  const itemTimeAgo = formatTimeAgo(item.created_at, t);

  return (
    <div
      onClick={() => onClick(item.id)}
      className={`group cursor-pointer border-b border-[var(--color-border)]/10 py-3 text-left transition-all duration-[var(--duration-base)] ${
        isSelected
          ? "bg-white/[0.06]"
          : "bg-transparent hover:bg-white/[0.03]"
      } ${isUsed ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Selection circle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(item.id);
          }}
          className={`mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
            isSelected
              ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] text-white animate-[pop_250ms_ease-out]"
              : "border-white/20 hover:border-[var(--color-accent-primary)]"
          }`}
        >
          {isSelected && <Check size={12} />}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`truncate text-sm font-semibold transition-colors hover:text-[var(--color-accent-primary)] ${
                isSelected
                  ? "text-[var(--color-accent-primary)]"
                  : "text-[var(--color-bg-surface)]"
              }`}
            >
              {item.title || t("digest.noTitle")}
            </a>
            {isUsed && (
              <span className="shrink-0 text-[10px] font-medium text-[var(--color-accent-success)]">
                {t("digest.detailUsed")}
              </span>
            )}
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            {domain && <span>{domain}</span>}
            <span>·</span>
            <span>{itemTimeAgo}</span>
          </div>

          {item.body_markdown && (
            <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]/80">
              {item.body_markdown}
            </p>
          )}
        </div>
      </div>

      {/* Bottom row: tags + actions */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {/* Category badges — orange pills */}
          {item.categories &&
            item.categories.map((cat) => (
              <span
                key={cat}
                className="text-xs text-[var(--color-text-secondary)]"
              >
                {cat}
              </span>
            ))}
          {item.categories?.length > 0 && item.tags?.length > 0 && (
            <span className="text-xs text-[var(--color-text-muted)]">·</span>
          )}
          {/* Tag badges — muted monospace with # */}
          {(item.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="font-mono text-[10px] text-[var(--color-text-muted)]"
            >
              #{tag}
            </span>
          ))}
          {(item.tags || []).length > 3 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              +{item.tags.length - 3}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex shrink-0 items-center gap-1 opacity-40 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateArticle(item);
            }}
            title={t("digest.createArticleAction")}
            className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-accent-primary)]"
          >
            <PenLine size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateIdea(item);
            }}
            title={t("digest.createIdeaAction")}
            className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-accent-primary)]"
          >
            <Lightbulb size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToNewsletter(item.id, e);
            }}
            title={t("digest.addToNewsletterLabel")}
            className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          >
            <Mail size={13} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(!showDeleteConfirm);
              }}
              title={t("digest.delete")}
              className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-accent-danger)]"
            >
              <Trash2 size={13} />
            </button>
            {showDeleteConfirm && (
              <div
                ref={deleteRef}
                className="absolute right-0 top-8 z-50 w-48 animate-[scaleIn_150ms_ease-out] rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg-base)] p-2 shadow-2xl ring-1 ring-black/30"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                  {t("digest.deleteConfirm")}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-white/10"
                  >
                    <X size={12} /> {t("digest.deleteCancel")}
                  </button>
                  <button
                    onClick={() => {
                      onDelete(item.id);
                      setShowDeleteConfirm(false);
                    }}
                    className="flex cursor-pointer items-center gap-1 rounded-md bg-[var(--color-accent-danger)]/20 px-2 py-1 text-xs text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)]/30"
                  >
                    <Trash2 size={12} /> {t("digest.deleteConfirmAction")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
