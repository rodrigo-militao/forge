import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, EyeOff } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { api, type ContentItem } from "../../api/client";
import { queryKeys } from "../../lib/queryKeys";
import { ContentEditor } from "../../components/editor/ContentEditor";
import { useAutosave } from "../../hooks/useAutosave";
import { useAITransform } from "../../hooks/useAITransform";
import { filterLibraryContent } from "./filter";

export function LibraryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { selected?: string };
  const { handleTransform } = useAITransform();
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");


  const [showDeleted, setShowDeleted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");


  const { data: content, isLoading } = useQuery({
    queryKey: queryKeys.content.all,
    queryFn: api.content.list,
  });

  const { data: availableTags } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: api.content.listTags,
  });

  const filteredContent = filterLibraryContent({
    content: content ?? [],
    showDeleted,
    categoryFilter,
    tagFilter,
  });

  const categories = [
    ...new Set((content ?? []).flatMap((c) => c.categories).filter(Boolean)),
  ];

  useEffect(() => {
    if (search.selected && content) {
      const item = content.find((c) => c.id === search.selected);
      if (item) {
        setSelectedItem(item);
        setEditTitle(item.title ?? "");
        setEditBody(item.body_markdown ?? "");
      }
    }
  }, [search.selected, content]);

  useEffect(() => {
    if (selectedItem) {
      setEditTitle(selectedItem.title ?? "");
      setEditBody(selectedItem.body_markdown ?? "");
    }
  }, [selectedItem]);

  const handleSave = useCallback(async () => {
    if (!selectedItem) return;
    await api.content.save(selectedItem.id, { title: editTitle, body_markdown: editBody });
    queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
  }, [selectedItem, editTitle, editBody, queryClient]);

  const { isSynced, isSaving, error: saveError } = useAutosave({
    save: handleSave,
    deps: [editBody, editTitle, selectedItem?.id],
    enabled: !!selectedItem && (editBody.length > 0 || editTitle.length > 0),
  });


  const handleAddTag = useCallback(async (tag: string) => {
    if (!selectedItem) return;
    try {
      await api.content.addTag(selectedItem.id, tag);
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add tag");
    }
  }, [selectedItem, queryClient]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!selectedItem) return;
    try {
      await api.content.removeTag(selectedItem.id, tag);
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove tag");
    }
  }, [selectedItem, queryClient]);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!selectedItem) return;
    try {
      await api.content.updateStatus(selectedItem.id, status);
      setSelectedItem((prev) => prev ? { ...prev, status: status as ContentItem["status"] } : null);
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      toast.success(t("editor.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [selectedItem, queryClient, t]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-card !mb-0 !h-9 w-32 rounded-lg" />
        </div>
        <div className="mt-5 space-y-3">
          <div className="skeleton skeleton-card rounded-lg" />
          <div className="skeleton skeleton-card rounded-lg" />
          <div className="skeleton skeleton-card rounded-lg" />
        </div>
      </div>
    );
  }

  if (selectedItem) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button onClick={() => setSelectedItem(null)} className="cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] hover:underline">
          <ArrowLeft size={16} /> Back to library
        </button>
        <ContentEditor
          title={editTitle}
          onTitleChange={setEditTitle}
          body={editBody}
          onBodyChange={setEditBody}
          editorKey={selectedItem.id}
          onTransform={handleTransform}
          isSynced={isSynced}
          isSaving={isSaving}
          saveError={saveError}
        />
        {selectedItem.deleted_at && <span className="inline-block rounded bg-[var(--color-accent-danger)]/20 px-2 py-1 text-xs font-medium text-[var(--color-accent-danger)]">Deleted</span>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-[var(--font-display)] text-2xl">{t("library.title")}</h1>
      </div>

      {showDeleted || categories.length > 0 || (availableTags?.length ?? 0) > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setCategoryFilter("")}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  !categoryFilter
                    ? "bg-[var(--color-accent-primary)] text-white"
                    : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    categoryFilter === cat
                      ? "bg-[var(--color-accent-primary)] text-white"
                      : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          {availableTags && availableTags.length > 0 && (
            <>
              <span className="h-4 w-px bg-white/10" />
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setTagFilter("")}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    !tagFilter
                      ? "bg-[var(--color-accent-primary)] text-white"
                      : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
                  }`}
                >
                  {t("library.tagFilter")}
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      tagFilter === tag
                        ? "bg-[var(--color-accent-primary)] text-white"
                        : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </>
          )}
          <span className="h-4 w-px bg-white/10" />
          <button
            onClick={() => setShowDeleted((prev) => !prev)}
            className={`cursor-pointer flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              showDeleted
                ? "bg-white/10 text-[var(--color-bg-surface)]"
                : "bg-white/[0.06] text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
            }`}
          >
            <EyeOff size={14} />
            {t("library.showDeleted")}
          </button>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {!filteredContent.length && (
          <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
            <svg
              width="96"
              height="72"
              viewBox="0 0 96 72"
              fill="none"
              className="mb-5 text-[var(--color-text-muted)]"
              aria-hidden="true"
            >
              <rect x="8" y="8" width="80" height="56" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.2" />
              <path d="M20 24h56" stroke="currentColor" strokeWidth="1" opacity="0.15" />
              <path d="M20 36h40" stroke="currentColor" strokeWidth="1" opacity="0.1" />
              <path d="M20 48h24" stroke="currentColor" strokeWidth="1" opacity="0.08" />
            </svg>
            <p className="text-sm text-[var(--color-text-muted)]">{t("library.empty")}</p>
          </div>
        )}
        {filteredContent.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => { setSelectedItem(item); setEditTitle(item.title ?? ""); setEditBody(item.body_markdown ?? ""); }}
            style={{ animationDelay: `${idx * 50}ms` }}
            className={`cursor-pointer border-b border-[var(--color-border)]/10 py-3 transition-all duration-200 opacity-0 animate-[fadeIn_400ms_ease-out_forwards] hover:bg-white/[0.03] ${
              item.deleted_at
                ? "opacity-60"
                : ""
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium text-[var(--color-bg-surface)]">{item.title || "(no title)"}</h3>
                {item.product === "digest" && <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{t("library.sourceBadge")}</span>}
                {item.categories && item.categories.length > 0 && item.categories.map((cat, ci) => (
                  <span key={cat}>
                    {ci > 0 && <span className="text-xs text-[var(--color-text-muted)]">·</span>}
                    <span className="text-xs text-[var(--color-text-secondary)]">{cat}</span>
                  </span>
                ))}
                {item.status === "published" && <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">{t("library.published")}</span>}
                {item.status === "discarded" && <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{t("library.discarded")}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {item.deleted_at && <span className="inline-block text-xs text-[var(--color-text-muted)]">Deleted</span>}
                {(item.tags || []).map((tag, ti) => (
                  <span key={tag}>
                    {ti > 0 && <span className="text-xs text-[var(--color-text-muted)]">·</span>}
                    <span className="text-xs text-[var(--color-text-muted)]">#{tag}</span>
                  </span>
                ))}
              </div>
            </div>
            {item.type === "article" && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate({ to: `/content/articles/${item.id}/edit` }); }}
                className="ml-auto shrink-0 cursor-pointer rounded bg-[var(--color-accent-primary)]/10 px-2 py-1 text-xs font-medium text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/20"
              >
                <ExternalLink size={12} className="mr-0.5 inline" />Editor
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
