import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, EyeOff, Plus, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { api, type ContentItem } from "../../api/client";
import { TiptapEditor } from "../../components/editor/TiptapEditor";
import { useAutosave } from "../../hooks/useAutosave";

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
  const [newTag, setNewTag] = useState("");

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
      return isComposeOrNewsletter && c.deleted_at === null;
    }
    const include = isComposeOrNewsletter || c.deleted_at !== null;
    if (!include) return false;
    if (categoryFilter && c.category !== categoryFilter) return false;
    if (tagFilter && !(c.tags || []).includes(tagFilter)) return false;
    return true;
  });

  const categories = [
    ...new Set((content ?? []).map((c) => c.category).filter(Boolean) as string[]),
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
      await api.content.save(selectedItem.id, { title: editTitle, body_markdown: editBody });
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.success(t("editor.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
    setSaving(false);
  }, [selectedItem, editTitle, editBody, queryClient, t]);

  const autosave = useMemo(() => handleSave, [handleSave]);
  useAutosave({
    save: autosave,
    deps: [editBody, editTitle, selectedItem?.id],
    enabled: !!selectedItem && (editBody.length > 0 || editTitle.length > 0),
  });

  const handleAddTag = useCallback(async (tag: string) => {
    if (!selectedItem) return;
    try {
      await api.content.addTag(selectedItem.id, tag);
      queryClient.invalidateQueries({ queryKey: ["content"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add tag");
    }
  }, [selectedItem, queryClient]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!selectedItem) return;
    try {
      await api.content.removeTag(selectedItem.id, tag);
      queryClient.invalidateQueries({ queryKey: ["content"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove tag");
    }
  }, [selectedItem, queryClient]);

  if (isLoading) return <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>;

  if (selectedItem) {
    const itemTags = selectedItem.tags ?? [];
    const unusedTags = (availableTags ?? []).filter((t) => !itemTags.includes(t));
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button onClick={() => setSelectedItem(null)} className="cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] hover:underline">
          <ArrowLeft size={16} /> Back to library
        </button>
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 text-lg font-[var(--font-display)] text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none" />
        <TiptapEditor content={editBody} onUpdate={(html) => setEditBody(html)} className="min-h-[300px]" />
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-bg-surface)]">{t("editor.tags")}</label>
          <div className="flex flex-wrap gap-2">
            {itemTags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded bg-[var(--color-accent-primary)]/20 px-2 py-1 text-xs text-[var(--color-accent-primary)]">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="cursor-pointer hover:opacity-70"><X size={12} /></button>
              </span>
            ))}
            {itemTags.length === 0 && <span className="text-xs text-[var(--color-text-muted)]">{t("editor.noTags")}</span>}
          </div>
          {unusedTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {unusedTags.map((tag) => (
                <button key={tag} onClick={() => handleAddTag(tag)} className="cursor-pointer rounded bg-white/10 px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/20">{tag}</button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newTag.trim()) { handleAddTag(newTag.trim()); setNewTag(""); } }} placeholder={t("editor.addTag")} className="flex-1 rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none" />
            <button onClick={() => { if (newTag.trim()) { handleAddTag(newTag.trim()); setNewTag(""); } }} disabled={!newTag.trim()} className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"><Plus size={14} /></button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving ? t("editor.saving") : t("editor.save")}
          </button>
          {selectedItem.deleted_at && <span className="inline-block rounded bg-[var(--color-accent-danger)]/20 px-2 py-1 text-xs font-medium text-[var(--color-accent-danger)]">Deleted</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[var(--font-display)] text-2xl">{t("library.title")}</h1>
        <button onClick={() => setShowDeleted((prev) => !prev)} className={`cursor-pointer flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${showDeleted ? "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]" : "border-[var(--color-border)]/20 text-[var(--color-text-muted)]"}`}>
          <EyeOff size={16} /> {t("library.showDeleted")}
        </button>
      </div>
      {showDeleted && (
        <div className="flex flex-wrap items-center gap-3">
          {categories.length > 0 && (
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none">
              <option value="">All categories</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          )}
          {availableTags && availableTags.length > 0 && (
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none">
              <option value="">{t("library.tagFilter")}</option>
              {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          )}
        </div>
      )}
      <div className="space-y-3">
        {!filteredContent.length && <p className="text-sm text-[var(--color-text-muted)]">{t("library.empty")}</p>}
        {filteredContent.map((item) => (
          <div key={item.id} onClick={() => { setSelectedItem(item); setEditTitle(item.title ?? ""); setEditBody(item.body_markdown ?? ""); }} className={`cursor-pointer flex items-start justify-between rounded-lg border bg-white/5 p-4 transition-colors hover:border-[var(--color-accent-primary)] ${item.deleted_at ? "border-[var(--color-accent-danger)]/20 opacity-60" : "border-[var(--color-border)]/20"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[var(--color-bg-surface)]">{item.title || "(no title)"}</h3>
                {item.product === "digest" && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">Digest</span>}
                {item.category && <span className="rounded-full bg-[var(--color-accent-primary)]/20 px-2 py-0.5 text-xs text-[var(--color-accent-primary)]">{item.category}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {item.deleted_at && <span className="inline-block rounded bg-[var(--color-accent-danger)]/20 px-2 py-0.5 text-xs text-[var(--color-accent-danger)]">Deleted</span>}
                {(item.tags || []).map((tag) => <span key={tag} className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">#{tag}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
