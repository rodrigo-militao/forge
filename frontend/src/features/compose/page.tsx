import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { PenLine, Sparkles, WandSparkles, FileText, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, type ContentItem } from "../../api/client";
import { queryKeys } from "../../lib/queryKeys";
import { useJobPolling } from "../../hooks/useJobPolling";
import { TagInput } from "../../components/ui/tag-input";
import { Input } from "../../components/ui/input";
import { TiptapEditor } from "../../components/editor/TiptapEditor";
import type { Editor } from "@tiptap/react";

type Mode = "ai" | "blank";
type AiStep = "topic" | "outline" | "draft";

export function ComposePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(null);
  const [theme, setTheme] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [outlineRunning, setOutlineRunning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editOutline, setEditOutline] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiStep, setAiStep] = useState<AiStep>("topic");

  const { data: content } = useQuery({ queryKey: queryKeys.content.all, queryFn: api.content.list });
  const items = content?.filter((c) => c.product === "compose") ?? [];

  useJobPolling(generating, items.length, { interval: 3000, timeout: 60000, filter: (c) => c.product === "compose", onComplete: () => { setGenerating(false); toast.success("Draft ready in Library"); }, onTimeout: () => { setGenerating(false); } });
  useJobPolling(aiRunning, items.length, { interval: 3000, timeout: 90000, filter: (c) => c.product === "compose", onComplete: () => { setAiRunning(false); toast.success("Topic ready in Library"); }, onTimeout: () => { setAiRunning(false); } });
  useJobPolling(outlineRunning, items.length, { interval: 3000, timeout: 60000, filter: (c) => c.product === "compose", onComplete: () => { setOutlineRunning(false); toast.success("Outline ready"); }, onTimeout: () => { setOutlineRunning(false); } });

  const handleGenerateDraft = useCallback(async () => { if (!theme.trim()) return; setGenerating(true); try { await api.compose.generateDraft(theme); toast.success("Draft generation queued"); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); setGenerating(false); } }, [theme]);

  const handleGenerateTopic = useCallback(async () => { setAiRunning(true); try { await api.compose.generateTopic(); toast.success("Topic generation queued"); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); setAiRunning(false); } }, []);

  const handleGenerateOutline = useCallback(async (themeText: string) => {
    setOutlineRunning(true);
    try {
      await api.compose.generateOutline(themeText);
      toast.success("Outline generation queued");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setOutlineRunning(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await api.content.save(selectedItem.id, { title: editTitle, body_markdown: editBody });
      if (selectedItem.outline !== undefined && editOutline !== (selectedItem.outline ?? "")) {
        await api.content.updateOutline(selectedItem.id, editOutline);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [selectedItem, editTitle, editBody, editOutline, queryClient]);

  const handleTransform = useCallback(async (action: "expand" | "rewrite", editor: Editor) => {
    const text = editor.getText();
    try {
      const result = await api.compose.transform(text, action);
      toast.success(`${action} queued (${result.item_count} items)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transform failed");
    }
  }, []);

  const handleAddTag = useCallback(async (tag: string) => {
    if (!selectedItem || !tag.trim()) return;
    try {
      await api.content.addTag(selectedItem.id, tag.trim());
      await queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [selectedItem, queryClient]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!selectedItem) return;
    try {
      await api.content.removeTag(selectedItem.id, tag);
      await queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [selectedItem, queryClient]);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!selectedItem) return;
    try {
      await api.content.updateStatus(selectedItem.id, status);
      await queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      toast.success("Status updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [selectedItem, queryClient]);

  // --- AI Mode ---
  if (mode === "ai") {
    // Step 1: Generate Topic
    if (aiStep === "topic") {
      return (
        <div className="mx-auto max-w-2xl space-y-8">
          <h1 className="font-[var(--font-display)] text-center text-2xl">{t("compose.generateWithAI")}</h1>
          <div className="space-y-4">
            <button onClick={handleGenerateTopic} disabled={aiRunning} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50">
              {aiRunning ? t("compose.generating") : <><Sparkles size={16} /> {t("compose.generateTopic")}</>}
            </button>
            {items.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">Available topics</h3>
                {items.map((item) => (
                  <button key={item.id} onClick={() => { setSelectedItem(item); setEditTitle(item.title ?? ""); setEditBody(item.body_markdown ?? ""); setEditOutline(item.outline ?? ""); setAiStep(item.outline ? "outline" : "draft"); }} className="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)]/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10 cursor-pointer">
                    <PenLine size={16} className="shrink-0 text-[var(--color-accent-primary)]" />
                    <span className="flex-1 truncate text-sm text-[var(--color-bg-surface)]">{item.title || "(no title)"}</span>
                    {item.outline && <span className="shrink-0 rounded bg-[var(--color-accent-primary)]/20 px-1.5 py-0.5 text-xs text-[var(--color-accent-primary)]">Outline</span>}
                    <ChevronRight size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                  </button>
                ))}
              </div>
            )}
            {items.length === 0 && !aiRunning && <p className="text-sm text-center text-[var(--color-text-muted)]">{t("compose.noTopics")}</p>}
          </div>
          <button onClick={() => setMode(null)} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)] cursor-pointer">{t("nav.back")}</button>
        </div>
      );
    }

    // Step 2: Outline Review
    if (aiStep === "outline" && selectedItem) {
      return (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>{t("compose.generateWithAI")}</span>
            <ChevronRight size={14} />
            <span className="text-[var(--color-bg-surface)]">Outline</span>
          </div>
          <h1 className="font-[var(--font-display)] text-2xl">Review outline</h1>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Title</label>
            <Input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Article title…" />
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Outline</label>
            <textarea value={editOutline} onChange={(e) => setEditOutline(e.target.value)} rows={12} className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-4 py-3 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] font-mono" placeholder="Article outline…" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setAiStep("draft"); }} className="flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 cursor-pointer">
              <PenLine size={16} /> Generate draft from outline
            </button>
            <button onClick={() => setAiStep("topic")} className="rounded-lg border border-[var(--color-border)]/20 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5 cursor-pointer">
              {t("nav.back")}
            </button>
          </div>
        </div>
      );
    }

    // Step 3: Draft Editor
    if (aiStep === "draft" && selectedItem) {
      return (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>{t("compose.generateWithAI")}</span>
            <ChevronRight size={14} />
            <span className="text-[var(--color-bg-surface)]">Draft</span>
          </div>
          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border-b border-[var(--color-border)]/10 bg-transparent py-2 text-lg font-medium text-[var(--color-bg-surface)] outline-none placeholder:text-[var(--color-text-muted)]" placeholder="Article title…" />
          {editOutline && (
            <div className="rounded-lg border border-[var(--color-accent-primary)]/20 bg-[var(--color-accent-primary)]/5 p-3">
              <p className="mb-1 text-xs font-medium text-[var(--color-accent-primary)]">Following outline</p>
              <p className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)] line-clamp-4">{editOutline}</p>
            </div>
          )}
          <TiptapEditor content={editBody} onUpdate={setEditBody} onTransform={handleTransform} />
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer">
              {saving ? t("editor.saving") : t("editor.save")}
            </button>
            <select value={selectedItem.status} onChange={(e) => handleStatusChange(e.target.value)} className="rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-bg-surface)] outline-none cursor-pointer">
              <option value="draft">{t("editor.draft")}</option>
              <option value="published">{t("editor.published")}</option>
              <option value="discarded">{t("editor.discarded")}</option>
            </select>
          </div>
          <TagInput
            tags={selectedItem.tags}
            onAdd={(tag) => handleAddTag(tag)}
            onRemove={(tag) => handleRemoveTag(tag)}
          />
          <button onClick={() => { setAiStep("topic"); setSelectedItem(null); }} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)] cursor-pointer">{t("nav.back")}</button>
        </div>
      );
    }
  }

  // --- Blank Mode ---
  if (mode === "blank") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-[var(--font-display)] text-2xl">{t("compose.startBlank")}</h1>
        <div className="flex gap-2">
          <Input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleGenerateDraft(); }} placeholder={t("compose.writeArticle")} className="flex-1" />
          <button onClick={() => handleGenerateOutline(theme)} disabled={!theme.trim() || outlineRunning} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-accent-primary)]/30 px-3 py-2 text-sm text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/10 disabled:opacity-50 cursor-pointer">
            <FileText size={14} /> {outlineRunning ? t("compose.generating") : "Outline"}
          </button>
          <button onClick={handleGenerateDraft} disabled={!theme.trim() || generating} className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer">
            {generating ? t("compose.generating") : <><Sparkles size={14} /> Generate</>}
          </button>
        </div>
        <TiptapEditor content={editBody} onUpdate={setEditBody} onTransform={handleTransform} />
        <button onClick={() => setMode(null)} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)] cursor-pointer">{t("nav.back")}</button>
      </div>
    );
  }

  // --- Mode Selection ---
  return (
    <div className="mx-auto max-w-md space-y-8">
      <h1 className="font-[var(--font-display)] text-center text-2xl text-balance">{t("compose.title")}</h1>
      <div className="space-y-4">
        <button onClick={() => setMode("ai")} className="flex w-full items-center gap-4 rounded-lg border border-[var(--color-border)]/10 bg-white/5 p-5 text-left transition-colors hover:bg-white/10 cursor-pointer">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-primary)]/20">
            <WandSparkles size={20} className="text-[var(--color-accent-primary)]" />
          </div>
          <div>
            <span className="block font-medium text-[var(--color-bg-surface)]">{t("compose.generateWithAI")}</span>
            <span className="text-xs text-[var(--color-text-muted)]">Topic → outline → article</span>
          </div>
        </button>
        <button onClick={() => setMode("blank")} className="flex w-full items-center gap-4 rounded-lg border border-[var(--color-border)]/10 bg-white/5 p-5 text-left transition-colors hover:bg-white/10 cursor-pointer">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <PenLine size={20} className="text-[var(--color-text-secondary)]" />
          </div>
          <div>
            <span className="block font-medium text-[var(--color-bg-surface)]">{t("compose.startBlank")}</span>
            <span className="text-xs text-[var(--color-text-muted)]">Write from scratch with optional AI assist</span>
          </div>
        </button>
      </div>
    </div>
  );
}
