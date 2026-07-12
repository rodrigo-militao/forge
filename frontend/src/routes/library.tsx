import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, EyeOff, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { api, type ContentItem } from "../api/client";
import { TiptapEditor } from "../components/editor/TiptapEditor";
import { useAutosave } from "../hooks/useAutosave";

export function LibraryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as { selected?: string };
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
  });

  const { data: availableTags } = useQuery({
    queryKey: ["tags"],
    queryFn: api.content.listTags,
  });

  const filteredContent = (content ?? []).filter((c) => {
    const isComposeOrNewsletter = c.product === "compose" || c.product === "newsletter";
    const isDeletedDigest = c.product === "digest" && c.deleted_at !== null;
    if (!showDeleted) {
      // Default: show only non-deleted compose or newsletter items
      return isComposeOrNewsletter && c.deleted_at === null;
    }
    // With showDeleted: include all deleted items + normal compose/newsletter
    const include = isComposeOrNewsletter || c.deleted_at !== null;
    if (!include) return false;

    // Apply category filter
    if (categoryFilter && c.category !== categoryFilter) return false;
    // Apply tag filter
    if (tagFilter && !(c.tags || []).includes(tagFilter)) return false;
    return true;
  });

  const categories = [
    ...new Set(
      (content ?? [])
        .map((c) => c.category)
        .filter(Boolean) as string[],
    ),
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
    setSaving(true);
    try {
      await api.content.save(selectedItem.id, {
        title: editTitle,
        body_markdown: editBody,
      });
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
    setSaving(false);
  }, [selectedItem, editTitle, editBody, queryClient]);

  const autosave = useMemo(() => handleSave, [handleSave]);
  useAutosave({
    save: autosave,
    deps: [editBody, editTitle, selectedItem?.id],
    enabled: !!selectedItem && (editBody.length > 0 || editTitle.length > 0),
  });

  const handleApprove = useCallback(
    async (id: string) => {
      await api.content.approve(id);
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
    [queryClient],
  );

  const handleReject = useCallback(
    async (id: string) => {
      await api.content.reject(id);
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
    [queryClient],
  );

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: t("library.draft"),
      approved: t("library.approved"),
      rejected: t("library.rejected"),
    };
    return map[status] ?? status;
  };

  if (isLoading) return <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>;

  if (selectedItem) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          onClick={() => setSelectedItem(null)}
          className="cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to library
        </button>
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 text-lg font-[var(--font-display)] text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
        />
        <TiptapEditor
          content={editBody}
          onUpdate={(html) => setEditBody(html)}
          className="min-h-[300px]"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {selectedItem.deleted_at ? (
            <span className="inline-block rounded bg-[var(--color-accent-danger)]/20 px-2 py-1 text-xs font-medium text-[var(--color-accent-danger)]">
              Deleted
            </span>
          ) : (
            <>
              <span
                className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                  selectedItem.status === "approved"
                    ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]"
                    : selectedItem.status === "rejected"
                      ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                      : "bg-white/10 text-[var(--color-text-muted)]"
                }`}
              >
                {statusLabel(selectedItem.status)}
              </span>
              {selectedItem.status === "draft" && (
                <>
                  <button
                    onClick={() => { handleApprove(selectedItem.id); setSelectedItem(null); }}
                    className="cursor-pointer flex items-center gap-1 rounded-lg bg-[var(--color-accent-success)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
                  >
                    <Check size={14} />
                    {t("library.approve")}
                  </button>
                  <button
                    onClick={() => { handleReject(selectedItem.id); setSelectedItem(null); }}
                    className="cursor-pointer flex items-center gap-1 rounded-lg bg-[var(--color-accent-danger)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
                  >
                    <X size={14} />
                    {t("library.reject")}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[var(--font-display)] text-2xl">{t("library.title")}</h1>
        <button
          onClick={() => setShowDeleted((prev) => !prev)}
          className={`cursor-pointer flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            showDeleted
              ? "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]"
              : "border-[var(--color-border)]/20 text-[var(--color-text-muted)]"
          }`}
        >
          <EyeOff size={16} />
          {t("library.showDeleted")}
        </button>
      </div>

      {showDeleted && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Category filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
          {/* Tag filter */}
          {availableTags && availableTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
            >
              <option value="">All tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="space-y-3">
        {!filteredContent.length && (
          <p className="text-sm text-[var(--color-text-muted)]">{t("library.empty")}</p>
        )}
        {filteredContent.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              setSelectedItem(item);
              setEditTitle(item.title ?? "");
              setEditBody(item.body_markdown ?? "");
            }}
            className={`cursor-pointer flex items-start justify-between rounded-lg border bg-white/5 p-4 transition-colors hover:border-[var(--color-accent-primary)] ${
              item.deleted_at
                ? "border-[var(--color-accent-danger)]/20 opacity-60"
                : "border-[var(--color-border)]/20"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[var(--color-bg-surface)]">
                  {item.title || "(no title)"}
                </h3>
                {item.product === "digest" && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                    Digest
                  </span>
                )}
                {item.category && (
                  <span className="rounded-full bg-[var(--color-accent-primary)]/20 px-2 py-0.5 text-xs text-[var(--color-accent-primary)]">
                    {item.category}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {item.deleted_at ? (
                  <span className="inline-block rounded bg-[var(--color-accent-danger)]/20 px-2 py-0.5 text-xs text-[var(--color-accent-danger)]">
                    Deleted
                  </span>
                ) : (
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${
                      item.status === "approved"
                        ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]"
                        : item.status === "rejected"
                          ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                          : "bg-white/10 text-[var(--color-text-muted)]"
                    }`}
                  >
                    {statusLabel(item.status)}
                  </span>
                )}
                {(item.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            {item.status === "draft" && !item.deleted_at && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleApprove(item.id)}
                  className="cursor-pointer rounded-lg bg-[var(--color-accent-success)] p-2 text-white transition-opacity hover:opacity-80"
                  title={t("library.approve")}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="cursor-pointer rounded-lg bg-[var(--color-accent-danger)] p-2 text-white transition-opacity hover:opacity-80"
                  title={t("library.reject")}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
