import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { PenLine, Plus, Sparkles, WandSparkles, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, type ContentItem } from "../../api/client";
import { useJobPolling } from "../../hooks/useJobPolling";
import { TiptapEditor } from "../../components/editor/TiptapEditor";

type Mode = "ai" | "blank";

export function ComposePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(null);
  const [theme, setTheme] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");

  const { data: content } = useQuery({ queryKey: ["content"], queryFn: api.content.list });
  const { data: availableTags } = useQuery({ queryKey: ["tags"], queryFn: api.content.listTags });
  const items = content?.filter((c) => c.product === "compose") ?? [];

  useJobPolling(generating, items.length, { interval: 3000, timeout: 60000, filter: (c) => c.product === "compose", onComplete: () => { setGenerating(false); toast.success("Draft ready in Library"); }, onTimeout: () => { setGenerating(false); } });
  useJobPolling(aiRunning, items.length, { interval: 3000, timeout: 90000, filter: (c) => c.product === "compose", onComplete: () => { setAiRunning(false); toast.success("Topic ready in Library"); }, onTimeout: () => { setAiRunning(false); } });

  const handleGenerateDraft = useCallback(async () => { if (!theme.trim()) return; setGenerating(true); try { await api.compose.generateDraft(theme); toast.success("Draft generation queued"); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); setGenerating(false); } }, [theme]);
  const handleTransform = useCallback(
    async (action: "expand" | "rewrite", editor: import("@tiptap/react").Editor) => {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      if (!selectedText.trim()) { toast.error("Select some text first"); return; }
      try {
        await api.compose.transform(selectedText, action);
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} queued`);
      } catch (err) { toast.error(err instanceof Error ? err.message : "Transform failed"); }
    },
    [],
  );
  const handleGenerateTopic = useCallback(async () => { setAiRunning(true); try { await api.compose.generateTopic(); toast.success("Topic generation queued"); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); setAiRunning(false); } }, []);

  const handleSave = useCallback(async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await api.content.save(selectedItem.id, { title: editTitle, body_markdown: editBody });
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.success(t("editor.saved"));
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    setSaving(false);
  }, [selectedItem, editTitle, editBody, queryClient, t]);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!selectedItem) return;
    try {
      await api.content.updateStatus(selectedItem.id, status);
      setSelectedItem((prev) => prev ? { ...prev, status: status as ContentItem["status"] } : null);
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.success(t("editor.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [selectedItem, queryClient, t]);

  const handleAddTag = useCallback(async (tag: string) => {
    if (!selectedItem) return;
    try { await api.content.addTag(selectedItem.id, tag); queryClient.invalidateQueries({ queryKey: ["content"] }); queryClient.invalidateQueries({ queryKey: ["tags"] }); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to add tag"); }
  }, [selectedItem, queryClient]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!selectedItem) return;
    try { await api.content.removeTag(selectedItem.id, tag); queryClient.invalidateQueries({ queryKey: ["content"] }); queryClient.invalidateQueries({ queryKey: ["tags"] }); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to remove tag"); }
  }, [selectedItem, queryClient]);

  if (!mode) {
    return (
      <div className="mx-auto max-w-lg pt-20">
        <h1 className="font-[var(--font-display)] text-center text-2xl text-balance">{t("compose.title")}</h1>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <button onClick={() => setMode("ai")} className="cursor-pointer flex flex-col items-center gap-3 rounded-xl border bg-white/5 p-8 text-center transition-all duration-200 hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_var(--color-accent-primary)]">
            <Sparkles size={32} className="text-[var(--color-accent-primary)]" />
            <span className="font-medium text-[var(--color-bg-surface)]">{t("compose.generateWithAI")}</span>
            <span className="text-xs text-[var(--color-text-muted)]">Topic → voice → full article</span>
          </button>
          <button onClick={() => setMode("blank")} className="cursor-pointer flex flex-col items-center gap-3 rounded-xl border bg-white/5 p-8 text-center transition-all duration-200 hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_var(--color-accent-primary)]">
            <PenLine size={32} className="text-[var(--color-accent-primary)]" />
            <span className="font-medium text-[var(--color-bg-surface)]">{t("compose.startBlank")}</span>
            <span className="text-xs text-[var(--color-text-muted)]">TipTap editor with AI on demand</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "ai") {
    if (selectedItem) {
      return (
        <div className="mx-auto max-w-3xl">
          <button onClick={() => setSelectedItem(null)} className="cursor-pointer flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-primary)]">
            &larr; {t("nav.backToList")}
          </button>
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-5 w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-4 py-2 text-lg font-[var(--font-display)] text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]" />
          <TiptapEditor key={selectedItem.id} content={selectedItem.body_markdown ?? ""} onTransform={handleTransform} className="mt-5 min-h-[300px]" />
          <div className="mt-5 space-y-3">
            <label className="text-sm font-medium text-[var(--color-bg-surface)]">{t("editor.tags")}</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {(selectedItem.tags ?? []).length > 0 ? (selectedItem.tags ?? []).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-primary)]/20 px-2.5 py-0.5 text-xs text-[var(--color-accent-primary)]">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="cursor-pointer hover:text-[var(--color-accent-danger)]"><X size={11} /></button>
                </span>
              )) : (
                <span className="text-xs text-[var(--color-text-muted)]">{t("editor.noTags")}</span>
              )}
            </div>
            {(availableTags ?? []).filter((t) => !(selectedItem.tags ?? []).includes(t)).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {(availableTags ?? []).filter((t) => !(selectedItem.tags ?? []).includes(t)).map((tag) => (
                  <button key={tag} onClick={() => handleAddTag(tag)} className="cursor-pointer rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]">+ {tag}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newTag.trim()) { handleAddTag(newTag.trim()); setNewTag(""); } }} placeholder={t("editor.addTag")} className="flex-1 rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]" />
              <button onClick={() => { if (newTag.trim()) { handleAddTag(newTag.trim()); setNewTag(""); } }} disabled={!newTag.trim()} className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"><Plus size={14} /></button>
            </div>
          </div>
          <div className="mt-6">
            <label className="text-sm font-medium text-[var(--color-bg-surface)]">{t("editor.status")}</label>
            <div className="mt-1.5 flex gap-2">
              {(["draft", "published", "discarded"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedItem?.status === s
                      ? s === "published"
                        ? "bg-[var(--color-accent-primary)] text-white"
                        : s === "discarded"
                          ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                          : "bg-white/10 text-[var(--color-bg-surface)]"
                      : "bg-white/[0.06] text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
                  }`}
                >
                  {t(`editor.${s}` as const)}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSave} disabled={saving} className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
              {saving ? t("editor.saving") : t("editor.save")}
            </button>
            <button onClick={() => setSelectedItem(null)} className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5">
              {t("settings.cancel")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-3xl">
        <button onClick={() => setMode(null)} className="cursor-pointer flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-primary)]">
          &larr; {t("nav.back")}
        </button>
        <div className="mt-4 flex items-center justify-between">
          <h1 className="font-[var(--font-display)] text-2xl">{t("compose.generateWithAI")}</h1>
          <button onClick={handleGenerateTopic} disabled={aiRunning} className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            <Sparkles size={16} className={aiRunning ? "animate-pulse" : ""} />
            {aiRunning ? t("compose.generating") : t("compose.generateTopic")}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {items.length === 0 && !aiRunning && (
            <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
              <svg width="96" height="72" viewBox="0 0 96 72" fill="none" className="mb-5 text-[var(--color-text-muted)]" aria-hidden="true">
                <rect x="8" y="8" width="80" height="56" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.2" />
                <path d="M28 24h40" stroke="currentColor" strokeWidth="1" opacity="0.15" />
                <path d="M28 36h24" stroke="currentColor" strokeWidth="1" opacity="0.1" />
                <path d="M28 48h16" stroke="currentColor" strokeWidth="1" opacity="0.08" />
              </svg>
              <p className="text-sm text-[var(--color-text-muted)]">{t("compose.noTopics")}</p>
              <button onClick={handleGenerateTopic} className="mt-4 cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
                <Sparkles size={14} className="inline" /> {t("compose.generateTopic")}
              </button>
            </div>
          )}
          {aiRunning && items.length === 0 && (
            <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
              <div className="mb-5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary)] animate-pulse [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary)] animate-pulse [animation-delay:300ms]" />
              </div>
              <p className="text-sm text-[var(--color-accent-primary)]">{t("compose.generating")}</p>
            </div>
          )}
          {items.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => { setSelectedItem(item); setEditTitle(item.title ?? ""); setEditBody(item.body_markdown ?? ""); }}
              style={{ animationDelay: `${idx * 50}ms` }}
              className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4 transition-all duration-200 opacity-0 animate-[fadeIn_400ms_ease-out_forwards] hover:bg-white/[0.08]"
            >
              <h3 className="font-medium text-[var(--color-bg-surface)]">{item.title || "(no title)"}</h3>
              {item.body_markdown && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.body_markdown}</p>}
              <span className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-[var(--color-text-muted)]">{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => setMode(null)} className="cursor-pointer flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-primary)]">
        &larr; {t("nav.back")}
      </button>
      <h1 className="mt-4 font-[var(--font-display)] text-2xl text-balance">{t("compose.startBlank")}</h1>
      <div className="mt-5 flex gap-2">
        <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleGenerateDraft(); }} placeholder={t("compose.writeArticle")} className="flex-1 rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]" />
        <button onClick={handleGenerateDraft} disabled={generating || !theme.trim()} className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
          <WandSparkles size={16} /> Generate
        </button>
      </div>
      <TiptapEditor content={editBody} onUpdate={(html) => setEditBody(html)} onTransform={handleTransform} className="mt-5 min-h-[300px]" />
    </div>
  );
}
