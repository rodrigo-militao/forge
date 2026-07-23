import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Lightbulb, Plus, ArrowUpRight, Archive, ArrowRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, type Idea } from "../../api/client";
import { queryKeys } from "../../lib/queryKeys";
import { TagInput } from "../../components/ui/tag-input";
import { Input } from "../../components/ui/input";

type PriorityFilter = "all" | "low" | "medium" | "high";
type StatusFilter = "all" | "open" | "in_progress" | "used" | "archived";

const priorityColors: Record<string, string> = {
  low: "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]",
  medium: "bg-yellow-500/15 text-yellow-400",
  high: "bg-[var(--color-accent-danger)]/15 text-[var(--color-accent-danger)]",
};

export function IdeasPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<Idea | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [notes, setNotes] = useState("");
  const [references, setReferences] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: ideas = [] } = useQuery({
    queryKey: queryKeys.ideas.all,
    queryFn: api.ideas.list,
  });

  const resetForm = () => {
    setTitle("");
    setContext("");
    setNotes("");
    setReferences("");
    setPriority("medium");
    setEditing(null);
    setCreating(false);
  };

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        context: context.trim() || undefined,
        notes: notes.trim() || undefined,
        references: references.trim() || undefined,
        priority,
      };
      if (editing) {
        await api.ideas.update(editing.id, data);
        toast.success(t("ideas.updated"));
      } else {
        await api.ideas.create(data);
        toast.success(t("ideas.created"));
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }, [title, context, notes, references, priority, editing, queryClient, t]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await api.ideas.archive(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
      toast.success(t("ideas.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [queryClient, t]);

  const handlePromote = useCallback(async (idea: Idea) => {
    try {
      const result = await api.ideas.promote(idea.id);
      navigate({ to: `/content/articles/${result.id}/edit` });
      toast.success(t("ideas.promoted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [navigate, t]);

  const handleAddTag = useCallback(async (ideaId: string, tag: string) => {
    if (!tag.trim()) return;
    try {
      await api.ideas.addTag(ideaId, tag.trim());
      await queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [queryClient]);

  const handleRemoveTag = useCallback(async (ideaId: string, tag: string) => {
    try {
      await api.ideas.removeTag(ideaId, tag);
      await queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [queryClient]);

  const startEdit = (idea: Idea) => {
    setEditing(idea);
    setTitle(idea.title);
    setContext(idea.context ?? "");
    setNotes(idea.notes ?? "");
    setReferences(idea.references ?? "");
    setPriority(idea.priority);
    setCreating(true);
  };

  const filtered = ideas.filter((idea) => {
    if (statusFilter !== "all" && idea.status !== statusFilter) return false;
    if (priorityFilter !== "all" && idea.priority !== priorityFilter) return false;
    if (tagFilter && !idea.tags.some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()))) return false;
    return true;
  });

  const activeFilters = [statusFilter !== "all", priorityFilter !== "all", tagFilter !== ""].filter(Boolean).length;

  // Create/Edit form
  if (creating || editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-8">
        <div className="flex items-center justify-between">
          <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-bg-surface)]">
            {editing ? "Edit idea" : t("ideas.createNew")}
          </h1>
          <button onClick={resetForm} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)] cursor-pointer">
            {t("nav.back")}
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">{t("editor.title")}</label>
            <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="py-2.5" placeholder="Idea title…" autoFocus />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">{t("ideas.context")}</label>
            <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]" placeholder={t("ideas.contextPlaceholder")} />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">{t("ideas.notes")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]" placeholder={t("ideas.notesPlaceholder")} />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">{t("ideas.references")}</label>
            <Input type="text" value={references} onChange={(e) => setReferences(e.target.value)} className="py-2.5" placeholder={t("ideas.referencesPlaceholder")} />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">{t("ideas.priority")}</label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((p) => (
                <button key={p} onClick={() => setPriority(p)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${priority === p ? "bg-[var(--color-accent-primary)] text-white" : "bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10"}`}>
                  {t(`ideas.priority${p.charAt(0).toUpperCase() + p.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || !title.trim()} className="rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer">
            {saving ? t("editor.saving") : editing ? t("editor.save") : t("ideas.created")}
          </button>
          <button onClick={resetForm} className="rounded-lg border border-[var(--color-border)]/20 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5 cursor-pointer">
            {t("nav.back")}
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6 px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-bg-surface)]">{t("ideas.title")}</h1>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 cursor-pointer">
          <Plus size={16} /> {t("ideas.createNew")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-2.5 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none cursor-pointer">
          <option value="all">{t("ideas.status")}</option>
          <option value="open">{t("ideas.statusOpen")}</option>
          <option value="in_progress">{t("ideas.statusInProgress")}</option>
          <option value="used">{t("ideas.statusUsed")}</option>
          <option value="archived">{t("ideas.statusArchived")}</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)} className="rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-2.5 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none cursor-pointer">
          <option value="all">{t("ideas.priority")}</option>
          <option value="low">{t("ideas.priorityLow")}</option>
          <option value="medium">{t("ideas.priorityMedium")}</option>
          <option value="high">{t("ideas.priorityHigh")}</option>
        </select>
        <input type="text" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder={t("digest.tagFilter")} className="rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-2.5 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none placeholder:text-[var(--color-text-muted)] w-32" />
        {activeFilters > 0 && (
          <button onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); setTagFilter(""); }} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)] cursor-pointer">
            {t("digest.clearFilters")}
          </button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 rounded-full bg-[var(--color-bg-surface-elevated)] p-4">
            <Lightbulb size={32} className="text-[var(--color-accent-primary)]" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">{t("ideas.empty")}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("ideas.emptyDesc")}</p>
        </div>
      )}

      {/* Ideas list */}
      <div className="space-y-3">
        {filtered.map((idea) => (
          <div key={idea.id} className="rounded-lg border border-[var(--color-border)]/10 bg-white/5 p-4 transition-colors hover:bg-white/[0.07]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-[var(--color-bg-surface)]">{idea.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[idea.priority] ?? ""}`}>
                    {idea.priority}
                  </span>
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                    {idea.status.replace("_", " ")}
                  </span>
                </div>
                {idea.context && (
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2">{idea.context}</p>
                )}
                {idea.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {idea.tags.map((tag) => (
                      <span key={tag} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => startEdit(idea)} className="rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)] cursor-pointer" title="Edit">
                  <ArrowUpRight size={14} />
                </button>
                <button onClick={() => handlePromote(idea)} className="rounded p-1.5 text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/10 cursor-pointer" title={t("ideas.promoteToArticle")}>
                  <ArrowRight size={14} />
                </button>
                <button onClick={() => handleArchive(idea.id)} className="rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-danger)]/10 hover:text-[var(--color-accent-danger)] cursor-pointer" title={t("ideas.statusArchived")}>
                  <Archive size={14} />
                </button>
              </div>
            </div>
            {/* Inline tag input */}
            <div className="mt-2">
              <TagInput
                tags={idea.tags}
                onAdd={(tag) => handleAddTag(idea.id, tag)}
                onRemove={(tag) => handleRemoveTag(idea.id, tag)}
                placeholder={t("editor.addTag")}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
