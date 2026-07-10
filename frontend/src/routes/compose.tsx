import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, PenLine, Sparkles, Type, WandSparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import toast from "react-hot-toast";
import { api } from "../api/client";

type Mode = "ai" | "blank";

export function ComposePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(null);
  const [theme, setTheme] = useState("");
  const [generating, setGenerating] = useState(false);
  const runningRef = useRef(false);

  const [aiRunning, setAiRunning] = useState(false);
  const aiRunningRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing\u2026" }),
    ],
    editorProps: {
      attributes: { class: "focus:outline-none min-h-[300px] text-sm leading-relaxed" },
    },
  });

  const { data: content } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
    refetchInterval: () => (runningRef.current ? 3000 : false),
  });

  const items = content?.filter((c) => c.product === "compose") ?? [];

  const handleGenerateDraft = useCallback(async () => {
    if (!theme.trim()) return;
    setGenerating(true);
    runningRef.current = true;
    const prevCount = items.length;

    try {
      await api.compose.generateDraft(theme);
      toast.success("Draft generation queued");
      const start = Date.now();
      const poll = setInterval(async () => {
        await queryClient.refetchQueries({ queryKey: ["content"] });
        const fresh = queryClient.getQueryData(["content"]);
        const ci = Array.isArray(fresh) ? fresh.filter((c: any) => c.product === "compose") : [];
        if (ci.length > prevCount || Date.now() - start > 60_000) {
          clearInterval(poll);
          setGenerating(false);
          runningRef.current = false;
          if (ci.length > prevCount) toast.success("Draft ready in Library");
        }
      }, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setGenerating(false);
      runningRef.current = false;
    }
  }, [theme, items.length, queryClient]);

  const handleTransform = useCallback(
    async (action: "expand" | "rewrite") => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const selected = editor.state.doc.textBetween(from, to);
      if (!selected.trim()) {
        toast.error("Select some text first");
        return;
      }

      runningRef.current = true;
      try {
        await api.compose.transform(selected, action);
        toast.success(`${action} job queued`);
        const poll = setInterval(async () => {
          await queryClient.refetchQueries({ queryKey: ["content"] });
          const fresh = queryClient.getQueryData(["content"]);
          const transforms = Array.isArray(fresh)
            ? fresh.filter((c: any) => c.source_type === action)
            : [];
          if (transforms.length > 0) {
            clearInterval(poll);
            runningRef.current = false;
            const result = transforms[transforms.length - 1];
            editor
              .chain()
              .focus()
              .deleteRange({ from, to })
              .insertContent(result.body_markdown ?? "")
              .run();
            toast.success("Applied");
          }
        }, 3000);
        setTimeout(() => {
          clearInterval(poll);
          runningRef.current = false;
        }, 60_000);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
        runningRef.current = false;
      }
    },
    [editor, queryClient],
  );

  // ─── AI generation mode ─────────────────────────────────────────
  const handleGenerateTopic = useCallback(async () => {
    setAiRunning(true);
    aiRunningRef.current = true;
    const prevCount = items.length;

    try {
      await api.compose.generateTopic();
      toast.success("Topic generation queued");
      const start = Date.now();
      const poll = setInterval(async () => {
        await queryClient.refetchQueries({ queryKey: ["content"] });
        const fresh = queryClient.getQueryData(["content"]);
        const ci = Array.isArray(fresh) ? fresh.filter((c: any) => c.product === "compose") : [];
        if (ci.length > prevCount || Date.now() - start > 90_000) {
          clearInterval(poll);
          setAiRunning(false);
          aiRunningRef.current = false;
          if (ci.length > prevCount) toast.success("Topic ready in Library");
        }
      }, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setAiRunning(false);
      aiRunningRef.current = false;
    }
  }, [items.length, queryClient]);

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
        <div className="space-y-3">
          {items.length === 0 && !aiRunning && (
            <p className="text-sm text-[var(--color-text-muted)]">{t("compose.noTopics")}</p>
          )}
          {aiRunning && items.length === 0 && (
            <p className="animate-pulse text-sm text-[var(--color-accent-primary)]">Generating topic\u2026</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4">
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
