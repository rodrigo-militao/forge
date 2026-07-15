import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { NewsletterEdition, ArticleRef } from "../../../api/client";
import { api } from "../../../api/client";
import { formatTimeAgo } from "../../digest/components/stats-bar";

interface NewsletterDetailPanelProps {
  item: NewsletterEdition;
  articles: ArticleRef[];
  removingArticle: string | null;
  generating: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: (item: NewsletterEdition) => void;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string | null) => void;
  onRemoveArticle: (contentID: string) => void;
  onGenerateIntro: () => void;
  onDestinationChange: (destination: string | null) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  building: { label: "Building", className: "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]" },
  ready: { label: "Ready", className: "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]" },
  published: { label: "Published", className: "bg-white/10 text-[var(--color-bg-surface)]" },
  archived: { label: "Archived", className: "bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]" },
};

const DEFAULT_DESTINATIONS = ["Substack", "Markdown genérico", "Texto simples"];

export function NewsletterDetailPanel({
  item,
  articles,
  removingArticle,
  generating,
  onClose,
  onEdit,
  onPreview,
  onDuplicate,
  onStatusChange,
  onCategoryChange,
  onRemoveArticle,
  onGenerateIntro,
  onDestinationChange,
}: NewsletterDetailPanelProps) {
  const { t } = useTranslation();
  const [editingCategory, setEditingCategory] = useState(false);
  const [catValue, setCatValue] = useState(item.category ?? "");
  const [editingDest, setEditingDest] = useState(false);
  const [destValue, setDestValue] = useState(item.destination ?? "");
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);

  const { data: usedDestinations } = useQuery({
    queryKey: ["editions", "destinations"],
    queryFn: api.newsletters.listDestinations,
  });

  const allSuggestions = [
    ...DEFAULT_DESTINATIONS,
    ...(usedDestinations?.filter((d) => !DEFAULT_DESTINATIONS.includes(d)) ?? []),
  ];

  const filteredSuggestions = destValue
    ? allSuggestions.filter((d) => d.toLowerCase().includes(destValue.toLowerCase()))
    : allSuggestions;

  // Outside click for destination dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setShowDestSuggestions(false);
      }
    }
    if (showDestSuggestions) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showDestSuggestions]);

  const cfg = statusConfig[item.status] ?? statusConfig.building;

  const handleDestSelect = useCallback((d: string) => {
    setDestValue(d);
    setShowDestSuggestions(false);
    onDestinationChange(d);
  }, [onDestinationChange]);

  const handleDestBlur = useCallback(() => {
    onDestinationChange(destValue || null);
  }, [destValue, onDestinationChange]);

  const nextTransitions: { status: string; label: string }[] = [];
  if (item.status === "building") {
    nextTransitions.push({ status: "ready", label: "Mark as ready" });
    nextTransitions.push({ status: "archived", label: "Archive" });
  } else if (item.status === "ready") {
    nextTransitions.push({ status: "published", label: "Mark as published" });
    nextTransitions.push({ status: "archived", label: "Archive" });
  } else if (item.status === "archived") {
    nextTransitions.push({ status: "building", label: "Reactivate" });
  }

  return (
    <div className="flex w-[400px] shrink-0 flex-col max-h-[75vh] rounded-lg border border-l-0 border-[var(--color-border)]/20 bg-white/5 shadow-[-4px_0_12px_rgba(0,0,0,0.12)]">
      <div className="flex-1 overflow-y-auto p-5">
        {/* Status + Close */}
        <div className="mb-4 flex items-center justify-between">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDuplicate(item)}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
              title="Duplicate"
            >
              <Copy size={14} /> Duplicate
            </button>
            <button
              onClick={onClose}
              className="cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-3 break-words text-lg font-semibold leading-snug text-[var(--color-bg-surface)]">
          {item.title || "(no title)"}
        </h2>

        {/* Last activity */}
        <p className="mb-4 text-xs text-[var(--color-text-muted)]">
          Updated {formatTimeAgo(item.updated_at, t)}
        </p>

        {/* Article count + topics */}
        <div className="mb-4 space-y-1 text-xs text-[var(--color-text-muted)]">
          <span>{item.article_count} {item.article_count === 1 ? "article" : "articles"} included</span>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Topics</label>
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--color-accent-primary)]/20 px-2 py-0.5 text-[11px] text-[var(--color-accent-primary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Destination */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Destination</label>
          <div ref={destRef} className="relative">
            {editingDest ? (
              <>
                <input
                  type="text"
                  value={destValue}
                  onChange={(e) => { setDestValue(e.target.value); setShowDestSuggestions(true); }}
                  onFocus={() => setShowDestSuggestions(true)}
                  onBlur={handleDestBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDestSelect(destValue);
                    if (e.key === "Escape") { setShowDestSuggestions(false); (e.target as HTMLInputElement).blur(); }
                  }}
                  placeholder="Type or select a destination..."
                  className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none transition-all duration-[var(--duration-fast)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)]/30"
                  autoFocus
                />
                {showDestSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-32 overflow-y-auto rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg-base)] p-1 shadow-lg">
                    {filteredSuggestions.map((d) => (
                      <button
                        key={d}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleDestSelect(d)}
                        className="flex w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-xs text-[var(--color-bg-surface)] transition-colors hover:bg-white/10"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => setEditingDest(true)}
                className="flex w-full cursor-pointer items-center rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent-primary)]/30 hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
              >
                {item.destination || "Click to set destination"}
              </button>
            )}
          </div>
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Category</label>
          {editingCategory ? (
            <input
              type="text"
              value={catValue}
              onChange={(e) => setCatValue(e.target.value)}
              onBlur={() => { setEditingCategory(false); onCategoryChange(catValue || null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setEditingCategory(false); onCategoryChange(catValue || null); }
                if (e.key === "Escape") { setEditingCategory(false); setCatValue(item.category ?? ""); }
              }}
              className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)]/30"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingCategory(true)}
              className="flex w-full cursor-pointer items-center rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent-primary)]/30 hover:text-[var(--color-bg-surface)]"
            >
              {item.category || "Click to set category"}
            </button>
          )}
        </div>

        {/* Status transitions */}
        {nextTransitions.length > 0 && (
          <div className="mb-4 space-y-2">
            <label className="block text-xs font-medium text-[var(--color-text-muted)]">Actions</label>
            {nextTransitions.map((t) => (
              <button
                key={t.status}
                onClick={() => onStatusChange(t.status)}
                className={`flex w-full cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-[var(--duration-fast)] active:scale-[0.97] ${
                  t.status === "archived"
                    ? "border border-[var(--color-accent-danger)]/30 bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)]/20"
                    : "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/30"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Edit + Preview buttons */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={onEdit}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)]/10 px-3 py-2 text-sm text-[var(--color-bg-surface)] transition-all hover:bg-white/10 active:scale-[0.97]"
          >
            Edit
          </button>
          <button
            onClick={onPreview}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)]/10 px-3 py-2 text-sm text-[var(--color-bg-surface)] transition-all hover:bg-white/10 active:scale-[0.97]"
          >
            Preview
          </button>
        </div>

        {/* Generate AI intro */}
        <div className="mb-4">
          <button
            onClick={onGenerateIntro}
            disabled={generating}
            className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/20 active:scale-[0.97] disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate AI Intro"}
          </button>
        </div>

        {/* Articles list */}
        {articles.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-muted)]">
              Articles ({articles.length})
            </label>
            <div className="space-y-1">
              {articles.map((a) => (
                <div
                  key={a.content_id}
                  className="flex items-center justify-between rounded-md bg-white/[0.04] px-2.5 py-1.5 transition-colors hover:bg-white/[0.08]"
                >
                  <span className="truncate text-xs text-[var(--color-bg-surface)]">
                    {a.title || "(no title)"}
                  </span>
                  <button
                    onClick={() => onRemoveArticle(a.content_id)}
                    disabled={removingArticle === a.content_id}
                    className="ml-1 cursor-pointer shrink-0 rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-danger)]/20 hover:text-[var(--color-accent-danger)] disabled:opacity-50"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
