import { useCallback, useEffect, useRef } from "react";
import { ArrowLeft, ScanText, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ContentItem, AIAnalysisResult, AITextSuggestion } from "../../../api/client";
import type { Reference } from "../../../api/types";
import { VisualEditor } from "./VisualEditor";
import { MarkdownEditor } from "./MarkdownEditor";
import { SplitEditor } from "./SplitEditor";
import { PreviewEditor } from "./PreviewEditor";

import { EditorSidebar } from "./EditorSidebar";
import { SuggestionModal } from "../SuggestionModal";
import { useOutline } from "../hooks/use-outline";
import { useDocumentStats } from "../hooks/use-document-stats";
import type { EditorMode } from "../hooks/use-article-editor";

interface EditorWorkspaceProps {
  /* Article data */
  article: ContentItem;
  contentLoaded: boolean;
  /* Editor */
  editTitle: string;
  setEditTitle: (title: string) => void;
  editBody: string; // Markdown
  setEditBody: (body: string) => void;
  handleBodyHtmlChange: (html: string) => void;
  contentVersion: number;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  focusMode: boolean;
  toggleFocusMode: () => void;
  /* Autosave */
  isSynced: boolean;
  isSaving: boolean;
  saveError: string | null;
  dirty: boolean;
  handleSave: () => Promise<void>;
  /* Transitions */
  transitioning: string | null;
  doTransition: (to: string) => void;
  /* References */
  showAttachRef: boolean;
  setShowAttachRef: (v: boolean) => void;
  articleRefs: Reference[];
  handleAttachRef: (refId: string) => void;
  handleDetachRef: (refId: string) => void;
  /* AI Analysis */
  persistedAnalysis: AIAnalysisResult | undefined;
  analyzing: boolean;
  analysisError: string | null;
  articleChangedSinceAnalysis: boolean;
  handleAnalyze: () => void;
  /* AI Improve */
  selection: { text: string; from: number; to: number } | null;
  handleSelectionChange: (text: string, from: number, to: number) => void;
  improveInstruction: string;
  setImproveInstruction: (inst: string) => void;
  suggestion: AITextSuggestion | null;
  improving: boolean;
  improveError: string | null;
  contentChanged: boolean;
  handleImprove: () => void;
  handleApplySuggestion: () => void;
  handleRejectSuggestion: () => void;
  fallbackText: string;
  setFallbackText: (text: string) => void;
  handleFallbackImprove: () => void;
  /* Navigation */
  navigate: (opts: { to: string }) => void;
}

/* ───── Lifecycle button styles (module-level constants) ───── */
const BTN_PRIMARY = "text-xs font-medium rounded-lg bg-[var(--color-accent-primary)] text-white px-3 py-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity";
const BTN_SECONDARY = "text-xs font-medium rounded-lg border border-[var(--color-border)]/10 px-3 py-1.5 text-[var(--color-bg-surface)] hover:bg-[var(--color-hover-subtle)] disabled:opacity-50 transition-colors";

export function EditorWorkspace({
  article,
  contentLoaded,
  editTitle,
  setEditTitle,
  editBody,
  setEditBody,
  handleBodyHtmlChange,
  contentVersion,
  editorMode,
  setEditorMode,
  focusMode,
  toggleFocusMode,
  isSynced,
  isSaving,
  saveError,
  dirty,
  handleSave,
  transitioning,
  doTransition,
  showAttachRef,
  setShowAttachRef,
  articleRefs,
  handleAttachRef,
  handleDetachRef,
  persistedAnalysis,
  analyzing,
  analysisError,
  articleChangedSinceAnalysis,
  handleAnalyze,
  selection,
  handleSelectionChange,
  improveInstruction,
  setImproveInstruction,
  suggestion,
  improving,
  improveError,
  contentChanged,
  handleImprove,
  handleApplySuggestion,
  handleRejectSuggestion,
  fallbackText,
  setFallbackText,
  handleFallbackImprove,
  navigate,
}: EditorWorkspaceProps) {
  const { t } = useTranslation();

  /* ───── Derived state ───── */
  const outlineItems = useOutline(editBody);
  const stats = useDocumentStats(editBody, articleRefs.length);

  /* ───── Lifecycle actions ───── */
  const lifecycleActions = (() => {
    switch (article.status) {
      case "building":
        return (
          <button className={BTN_PRIMARY} onClick={() => doTransition("review")} disabled={transitioning === "review"}>
            {transitioning === "review" ? "..." : t("articles.send_to_review")}
          </button>
        );
      case "review":
        return (
          <div className="flex gap-2">
            <button className={BTN_SECONDARY} onClick={() => doTransition("building")} disabled={transitioning === "building"}>
              {transitioning === "building" ? "..." : t("articles.back_to_editing")}
            </button>
            <button className={BTN_PRIMARY} onClick={() => doTransition("ready")} disabled={transitioning === "ready"}>
              {transitioning === "ready" ? "..." : t("articles.mark_ready")}
            </button>
          </div>
        );
      case "ready":
        return (
          <div className="flex gap-2">
            <button className={BTN_SECONDARY} onClick={() => doTransition("building")} disabled={transitioning === "building"}>
              {transitioning === "building" ? "..." : t("articles.back_to_editing")}
            </button>
            <span className="inline-flex items-center rounded text-xs font-medium px-2.5 py-1 bg-[var(--tt-color-highlight-green-contrast)] text-[var(--tt-color-text-green)]">
              {t("articles.ready_to_publish")}
            </span>
          </div>
        );
      case "published":
        return (
          <span className="inline-flex items-center rounded text-xs font-medium px-2.5 py-1 bg-[var(--tt-brand-color-800)] text-[var(--tt-brand-color-200)]">
            {t("articles.published")}
          </span>
        );
      default:
        return <span className="text-xs text-[var(--color-text-secondary)]">{article.status}</span>;
    }
  })();

  /* ───── Status badge ───── */
  const statusBadge = (() => {
    const labels: Record<string, string> = {
      building: t("articles.status_building"),
      review: t("articles.status_review"),
      ready: t("articles.status_ready"),
      published: t("articles.status_published"),
    };
    return (
      <span className="inline-flex items-center rounded text-xs font-medium px-1.5 py-0.5 border border-[var(--color-border)]/10 text-[var(--color-text-secondary)]">
        {labels[article.status] ?? article.status}
      </span>
    );
  })();

  /* ───── Toolbar right (AI Improve toolbar) ───── */
  const toolbarRight = selection ? (
    <div className="flex items-center gap-1.5 ml-2">
      <select
        value={improveInstruction}
        onChange={(e) => setImproveInstruction(e.target.value)}
        className="rounded border border-[var(--color-border)]/10 bg-[var(--color-bg-primary)] px-1.5 py-1 text-xs text-[var(--color-text-primary)] outline-none cursor-pointer"
      >
        <option value="Improve clarity">{t("articles.improve_clarity")}</option>
        <option value="Make more concise">{t("articles.make_concise")}</option>
        <option value="Fix grammar">{t("articles.fix_grammar")}</option>
        <option value="Make more professional">{t("articles.make_professional")}</option>
        <option value="Expand explanation">{t("articles.expand_explanation")}</option>
      </select>
      <button
        onClick={handleImprove}
        disabled={improving}
        className="cursor-pointer rounded bg-[var(--color-accent-primary)] px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {improving ? t("articles.improving") : t("articles.improve_with_ai")}
      </button>
    </div>
  ) : undefined;

  /* ───── Keyboard shortcuts ───── */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+S — force save
      if (mod && e.key === "s") {
        e.preventDefault();
        if (dirty) handleSave();
        return;
      }

      // Cmd/Ctrl+Shift+P — toggle Preview mode
      if (mod && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setEditorMode(editorMode === "preview" ? "visual" : "preview");
        return;
      }

      // Cmd/Ctrl+' — toggle Focus mode
      if (mod && e.key === "'") {
        e.preventDefault();
        toggleFocusMode();
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editorMode, toggleFocusMode, dirty, handleSave, setEditorMode]);

  /* ───── Scroll preservation on mode switch ───── */
  const editorAreaRef = useRef<HTMLDivElement>(null);
  const prevModeRef = useRef(editorMode);

  // Preserve scroll position on mode switch
  useEffect(() => {
    const oldMode = prevModeRef.current;
    const el = editorAreaRef.current;
    if (!el) return;

    // Save old mode's scroll
    if (oldMode !== editorMode) {
      sessionStorage.setItem(`editor-scroll-${oldMode}`, String(el.scrollTop));
    }

    // Restore new mode's saved scroll
    const saved = sessionStorage.getItem(`editor-scroll-${editorMode}`);
    if (saved) {
      requestAnimationFrame(() => {
        el.scrollTop = parseInt(saved, 10);
      });
    }

    prevModeRef.current = editorMode;
  }, [editorMode]);

  /* ───── Navigation-away guard ───── */
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /* ───── Scroll to heading in document ───── */
  const scrollToHeading = useCallback((slug: string) => {
    const editorArea = document.querySelector('[data-editor-area]');
    if (!editorArea) return;

    const headings = editorArea.querySelectorAll("h1, h2, h3, h4");
    for (const h of headings) {
      const text = h.textContent
        ?.toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim();
      if (text === slug) {
        h.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-full animate-[fadeIn_400ms_ease-out_forwards]" style={{ minHeight: 0 }}>
      {/* ═══ Slim header ═══ */}
      <div className="flex items-center justify-between px-6 py-2 shrink-0">
        <button
          onClick={() => navigate({ to: "/content/articles" })}
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <ArrowLeft size={13} />
        </button>

        <button
          onClick={toggleFocusMode}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 ${
            focusMode
              ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
              : "bg-white/10 text-[var(--color-text-muted)] hover:bg-white/[0.15] hover:text-[var(--color-bg-surface)]"
          }`}
          title={`${focusMode ? t("articles.exit_focus_mode", "Exit focus mode") : t("articles.focus_mode", "Focus mode")} (⌘')`}
        >
          <ScanText size={13} />
          <span>{t("articles.focus_mode", "Focus")}</span>
        </button>
      </div>

      {/* ═══ Editor + Sidebar (full height) ═══ */}
      <div className="flex flex-1 items-stretch overflow-hidden" style={{ minHeight: 0 }}>
        {/* Editor column: content fills, footer sticks to bottom */}
        <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: 0 }}>
          {/* Scrollable editor content */}
          <div
            ref={editorAreaRef}
            className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${
              ""
            }`}
            style={{ minHeight: 0 }}
            data-editor-area
          >
            {contentLoaded && (
              <div key={editorMode} className="flex-1 flex flex-col" style={{ animation: "fadeIn 200ms ease-out both" }}>
              {(() => { switch (editorMode) {
                case "visual":
                  return (
                    <VisualEditor
                      title={editTitle}
                      onTitleChange={setEditTitle}
                      body={editBody}
                      onBodyHtmlChange={handleBodyHtmlChange}
                      onSelectionChange={handleSelectionChange}
                      editorKey={`${article.id}-${contentVersion}`}
                      toolbarRight={toolbarRight}
                      showToolbar={!focusMode}
                      statusBadge={statusBadge}
                    />
                  );
                case "markdown":
                  return (
                    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6 pb-4">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder={t("articles.titlePlaceholder", "Untitled")}
                        maxLength={200}
                        aria-label={t("articles.titlePlaceholder", "Title")}
                        className="w-full overflow-hidden border-0 bg-transparent px-0 text-3xl font-[var(--font-display)] leading-tight tracking-tight text-[var(--color-bg-surface)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none"
                        style={{ textWrap: "balance" }}
                      />
                      <div className="mt-1.5 mb-4 flex items-center gap-2">
                        <span className="inline-flex items-center rounded text-[11px] font-medium px-1.5 py-0.5 text-[var(--color-text-muted)]">
                          {statusBadge}
                        </span>
                      </div>
                      <MarkdownEditor
                        value={editBody}
                        onChange={setEditBody}
                        onSelectionChange={handleSelectionChange}
                      />
                    </div>
                  );
                case "split":
                  return (
                    <div className="flex flex-1 flex-col">
                      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-6 pb-3 shrink-0">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder={t("articles.titlePlaceholder", "Untitled")}
                          maxLength={200}
                          aria-label={t("articles.titlePlaceholder", "Title")}
                          className="w-full overflow-hidden border-0 bg-transparent px-0 text-3xl font-[var(--font-display)] leading-tight tracking-tight text-[var(--color-bg-surface)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none"
                          style={{ textWrap: "balance" }}
                        />
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="inline-flex items-center rounded text-[11px] font-medium px-1.5 py-0.5 text-[var(--color-text-muted)]">
                            {statusBadge}
                          </span>
                        </div>
                      </div>
                      <SplitEditor
                        markdown={editBody}
                        onMarkdownChange={setEditBody}
                        onSelectionChange={handleSelectionChange}
                      />
                    </div>
                  );
                case "preview":
                  return (
                    <div className="flex flex-1 flex-col">
                      <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-3">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder={t("articles.titlePlaceholder", "Untitled")}
                          maxLength={200}
                          aria-label={t("articles.titlePlaceholder", "Title")}
                          className="w-full overflow-hidden border-0 bg-transparent px-0 text-3xl font-[var(--font-display)] leading-tight tracking-tight text-[var(--color-bg-surface)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none"
                          style={{ textWrap: "balance" }}
                        />
                        <div className="mt-1.5 mb-4 flex items-center gap-2">
                          <span className="inline-flex items-center rounded text-[11px] font-medium px-1.5 py-0.5 text-[var(--color-text-muted)]">
                            {statusBadge}
                          </span>
                        </div>
                      </div>
                      <PreviewEditor markdown={editBody} />
                    </div>
                  );
              }})()}
              </div>
            )}
            {contentLoaded && !editTitle && !editBody && (
              <p className="pt-2 text-center text-xs text-[var(--color-text-tertiary)]">
                {t("articles.start_writing_prompt")}
              </p>
            )}
          </div>

          {/* ═══ Bottom bar (inside editor column) ═══ */}
          <div className={`flex items-center justify-between shrink-0 px-6 py-2.5 border-t ${focusMode ? "border-[var(--color-border)]/[0.04]" : "border-[var(--color-border)]/10"}`}>
            <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
              <span>{stats.words} {t("articles.words")} · {stats.readingTimeMinutes} {t("articles.min_read")}</span>
            </div>
            <div className="flex items-center gap-2">
              {saveError && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--color-accent-danger)]/15 text-[var(--color-accent-danger)]">
                  <AlertCircle size={10} />
                  {t("articles.save_error")}
                  <button onClick={handleSave} className="underline hover:no-underline"><RefreshCw size={10} /></button>
                </span>
              )}
              {isSaving && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-500/15 text-amber-400">
                  <Loader2 size={10} className="animate-spin" />
                  {t("articles.saving")}
                </span>
              )}
              {lifecycleActions}
            </div>
          </div>
        </div>

        {/* Right sidebar — full height, animated enter/exit */}
        <div style={{ width: focusMode ? "0" : "18rem", transition: "width 300ms ease-out", opacity: focusMode ? 0 : 1 }} className="self-stretch shrink-0 overflow-hidden">
          <div style={{ width: "18rem" }} className="h-full self-stretch">
          <EditorSidebar
            editorMode={editorMode}
            setEditorMode={setEditorMode}
            outlineItems={outlineItems}
            onOutlineNavigate={scrollToHeading}
            stats={stats}
            analyzing={analyzing}
            analysisError={analysisError}
            persistedAnalysis={persistedAnalysis}
            articleChangedSinceAnalysis={articleChangedSinceAnalysis}
            handleAnalyze={handleAnalyze}
            improving={improving}
            improveError={improveError}
            selection={selection}
            fallbackText={fallbackText}
            setFallbackText={setFallbackText}
            handleFallbackImprove={handleFallbackImprove}
            contentChanged={contentChanged}
            articleRefs={articleRefs}
            showAttachRef={showAttachRef}
            setShowAttachRef={setShowAttachRef}
            handleAttachRef={handleAttachRef}
            handleDetachRef={handleDetachRef}
          />
          </div>
        </div>
      </div>

      {/* ═══ Suggestion modal ═══ */}
      {suggestion && (
        <SuggestionModal
          suggestion={suggestion}
          contentChanged={contentChanged}
          onReject={handleRejectSuggestion}
          onApply={handleApplySuggestion}
        />
      )}
    </div>
  );
}
