import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, PenLine, Sparkles, Type, WandSparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import toast from "react-hot-toast";
import { api } from "../api/client";
import { useJobPolling } from "../hooks/useJobPolling";
import { FontSize } from "../components/editor/FontSize";

type Mode = "ai" | "blank";

export function ComposePage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode | null>(null);
  const [theme, setTheme] = useState("");
  const [generating, setGenerating] = useState(false);

  const [aiRunning, setAiRunning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; title: string; body: string } | null>(null);
  const [transformAction, setTransformAction] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      FontSize,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[var(--color-accent-primary)] underline cursor-pointer" },
      }),
      Placeholder.configure({ placeholder: "Start writing\u2026" }),
    ],
    editorProps: {
      attributes: { class: "focus:outline-none min-h-[300px] text-sm leading-relaxed" },
    },
  });

  const { data: content } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
  });

  const items = content?.filter((c) => c.product === "compose") ?? [];

  useJobPolling(generating, items.length, {
    interval: 3000,
    timeout: 60_000,
    filter: (c) => c.product === "compose",
    onComplete: () => {
      setGenerating(false);
      toast.success("Draft ready in Library");
    },
    onTimeout: () => {
      setGenerating(false);
    },
  });

  useJobPolling(aiRunning, items.length, {
    interval: 3000,
    timeout: 90_000,
    filter: (c) => c.product === "compose",
    onComplete: () => {
      setAiRunning(false);
      toast.success("Topic ready in Library");
    },
    onTimeout: () => {
      setAiRunning(false);
    },
  });

  useJobPolling(transformAction !== null, items.length, {
    interval: 3000,
    filter: (c) => c.source_type === transformAction,
    onComplete: (newItems) => {
      const result = newItems[newItems.length - 1];
      if (editor) {
        const { from, to } = editor.state.selection;
        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(result.body_markdown ?? "")
          .run();
      }
      setTransformAction(null);
      toast.success("Applied");
    },
    onTimeout: () => {
      setTransformAction(null);
    },
  });

  const handleGenerateDraft = useCallback(async () => {
    if (!theme.trim()) return;
    setGenerating(true);
    try {
      await api.compose.generateDraft(theme);
      toast.success("Draft generation queued");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setGenerating(false);
    }
  }, [theme]);

  const handleTransform = useCallback(
    async (action: "expand" | "rewrite") => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const selected = editor.state.doc.textBetween(from, to);
      if (!selected.trim()) {
        toast.error("Select some text first");
        return;
      }

      try {
        await api.compose.transform(selected, action);
        setTransformAction(action);
        toast.success(`${action} job queued`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [editor],
  );

  // ─── AI generation mode ─────────────────────────────────────────
  const handleGenerateTopic = useCallback(async () => {
    setAiRunning(true);
    try {
      await api.compose.generateTopic();
      toast.success("Topic generation queued");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setAiRunning(false);
    }
  }, []);

  // ─── Mode selector ──────────────────────────────────────────────
  if (!mode) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pt-20">
        <h1 className="font-[var(--font-display)] text-center text-2xl">{t("compose.title")}</h1>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode("ai")}
            className="cursor-pointer flex flex-col items-center gap-3 rounded-xl border border-[var(--color-border)]/20 bg-white/5 p-8 text-center transition-colors hover:border-[var(--color-accent-primary)] hover:bg-white/10"
          >
            <Sparkles size={32} className="text-[var(--color-accent-primary)]" />
            <span className="font-medium text-[var(--color-bg-surface)]">
              {t("compose.generateWithAI")}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Topic &rarr; voice &rarr; full article
            </span>
          </button>
          <button
            onClick={() => setMode("blank")}
            className="cursor-pointer flex flex-col items-center gap-3 rounded-xl border border-[var(--color-border)]/20 bg-white/5 p-8 text-center transition-colors hover:border-[var(--color-accent-primary)] hover:bg-white/10"
          >
            <PenLine size={32} className="text-[var(--color-accent-primary)]" />
            <span className="font-medium text-[var(--color-bg-surface)]">
              {t("compose.startBlank")}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              TipTap editor with AI on demand
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "ai") {
    return (
      <div className="max-w-3xl space-y-6">
        <button
          onClick={() => setMode(null)}
          className="cursor-pointer text-sm text-[var(--color-accent-primary)] hover:underline"
        >
          &larr; Back
        </button>
        <div className="flex items-center justify-between">
          <h1 className="font-[var(--font-display)] text-2xl">{t("compose.generateWithAI")}</h1>
          <button
            onClick={handleGenerateTopic}
            disabled={aiRunning}
            className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={16} className={aiRunning ? "animate-pulse" : ""} />
            {aiRunning ? "Generating\u2026" : t("compose.generateTopic")}
          </button>
        </div>
        {selectedItem ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedItem(null)}
              className="cursor-pointer text-sm text-[var(--color-accent-primary)] hover:underline"
            >
              &larr; Back to list
            </button>
            <input
              defaultValue={selectedItem.title}
              className="w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 text-lg font-[var(--font-display)] text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
            />
            <textarea
              defaultValue={selectedItem.body}
              className="h-96 w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4 text-sm leading-relaxed text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {items.length === 0 && !aiRunning && (
              <p className="text-sm text-[var(--color-text-muted)]">{t("compose.noTopics")}</p>
            )}
            {aiRunning && items.length === 0 && (
              <p className="animate-pulse text-sm text-[var(--color-accent-primary)]">Generating topic\u2026</p>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem({ id: item.id, title: item.title ?? "", body: item.body_markdown ?? "" })}
                className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4 transition-colors hover:border-[var(--color-accent-primary)]"
              >
                <h3 className="font-medium text-[var(--color-bg-surface)]">{item.title || "(no title)"}</h3>
                {item.body_markdown && (
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.body_markdown}</p>
                )}
                <span className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Blank mode (TipTap editor) ─────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode(null)}
          className="cursor-pointer text-sm text-[var(--color-accent-primary)] hover:underline"
        >
          &larr; Back
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">|</span>
        <span className="text-xs text-[var(--color-text-muted)]">{t("compose.startBlank")}</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Enter a theme to generate a draft\u2026"
          className="flex-1 rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 text-sm text-[var(--color-bg-surface)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:outline-none"
        />
        <button
          onClick={handleGenerateDraft}
          disabled={generating || !theme.trim()}
          className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <WandSparkles size={16} />
          Generate
        </button>
      </div>

      <div className="flex gap-2 border-b border-[var(--color-border)]/20 pb-2">
        <button
          onClick={() => handleTransform("expand")}
          className="cursor-pointer flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          title="Select text first, then click Expand"
        >
          <Bot size={14} />
          Expand
        </button>
        <button
          onClick={() => handleTransform("rewrite")}
          className="cursor-pointer flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          title="Select text first, then click Rewrite"
        >
          <Type size={14} />
          Rewrite
        </button>
      </div>

      <div className="rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
