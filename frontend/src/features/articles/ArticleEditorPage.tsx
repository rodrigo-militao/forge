import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../api/client";
import { ContentEditor } from "../../components/editor/ContentEditor";
import { useAutosave } from "../../hooks/useAutosave";
import { queryKeys } from "../../lib/queryKeys";
import { useTranslation } from "react-i18next";
import type { AIAnalysisResult, AITextSuggestion, ContentItem, Reference } from "../../api/types";
import { AttachReferenceModal, ReferenceList } from "../references/ReferencesPage";
import { SuggestionModal } from "./SuggestionModal";

export function ArticleEditorPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const isNew = !id || id === "new";

  // --- Load existing article ---
  const { data: article, isLoading: articleLoading, error: articleError } = useQuery({
    queryKey: queryKeys.content.byId(id ?? ""),
    queryFn: () => api.content.get(id!),
    enabled: !isNew && !!id,
  });

  // --- Create article on /new ---
  const [creating, setCreating] = useState(isNew);
  useEffect(() => {
    if (!isNew) return;
    let cancelled = false;
    api.content.create().then((created) => {
      if (cancelled) return;
      setCreating(false);
      navigate({ to: `/content/articles/${created.id}/edit`, replace: true });
    }).catch(() => {
      if (cancelled) return;
      setCreating(false);
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Edit state ---
  const [contentLoaded, setContentLoaded] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    if (article) {
      setEditTitle(article.title ?? "");
      setEditBody(article.body_markdown ?? "");
      setContentLoaded(true);
    }
  }, [article]);

  // --- Autosave ---
  const handleSave = useCallback(async () => {
    if (!article) return;
    await api.content.save(article.id, {
      title: editTitle || undefined,
      body_markdown: editBody || undefined,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.content.byId(article.id) });
  }, [article, editTitle, editBody, queryClient]);

  const { isSynced, isSaving, error: saveError } = useAutosave({
    save: handleSave,
    deps: [editBody, editTitle],
    delay: 1500,
  });

  // --- Lifecycle transitions ---
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const doTransition = useCallback(async (to: string) => {
    if (!article) return;
    setTransitioning(to);
    try {
      await api.content.transition(article.id, to);
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.byId(article.id) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setTransitioning(null);
    }
  }, [article, queryClient]);

  // --- References ---
  const [showAttachRef, setShowAttachRef] = useState(false);
  const { data: articleRefs = [] } = useQuery({
    queryKey: queryKeys.references.byContent(article?.id ?? ""),
    queryFn: () => api.references.listForContent(article!.id),
    enabled: !!article,
  });

  const attachRefMut = useMutation({
    mutationFn: (refId: string) => api.references.attachToContent(article!.id, refId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.references.byContent(article?.id ?? "") }),
  });
  const detachRefMut = useMutation({
    mutationFn: (refId: string) => api.references.detachFromContent(article!.id, refId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.references.byContent(article?.id ?? "") }),
  });

  const handleAttachRef = useCallback(async (refId: string) => {
    await attachRefMut.mutateAsync(refId);
    setShowAttachRef(false);
  }, [attachRefMut]);

  const handleDetachRef = useCallback(async (refId: string) => {
    await detachRefMut.mutateAsync(refId);
  }, [detachRefMut]);

  // --- AI Editorial Assistance ---
  // Analyze
  const { data: persistedAnalysis } = useQuery({
    queryKey: queryKeys.ai.analysis(article?.id ?? ""),
    queryFn: () => api.content.ai.analysis(article?.id ?? ""),
    enabled: !!article,
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const articleChangedSinceAnalysis = persistedAnalysis && article
    ? new Date(article.updated_at).getTime() > new Date(persistedAnalysis.created_at).getTime()
    : false;

  const handleAnalyze = useCallback(async () => {
    if (!article) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      await api.content.ai.analyze(article.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.analysis(article.id) });
    } catch (err: any) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [article, queryClient]);

  // Selection state
  const [selection, setSelection] = useState<{ text: string; from: number; to: number } | null>(null);
  const handleSelectionChange = useCallback((text: string, from: number, to: number) => {
    if (text.trim()) {
      setSelection({ text, from, to });
    } else {
      setSelection(null);
    }
  }, []);

  // Improve text (selection-based)
  const [improveInstruction, setImproveInstruction] = useState("Improve clarity");
  const [suggestion, setSuggestion] = useState<AITextSuggestion | null>(null);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [contentChanged, setContentChanged] = useState(false);

  const handleImprove = useCallback(async () => {
    if (!article || !selection) return;
    setImproving(true);
    setImproveError(null);
    setSuggestion(null);
    setContentChanged(false);
    try {
      const start = Math.max(0, selection.from - 100);
      const end = Math.min(editBody.length, selection.to + 100);
      const ctxBefore = editBody.slice(start, selection.from);
      const ctxAfter = editBody.slice(selection.to, end);

      const result = await api.content.ai.improve(
        article.id, selection.text, improveInstruction, ctxBefore, ctxAfter,
      );
      setSuggestion(result);
    } catch (err: any) {
      setImproveError(err instanceof Error ? err.message : "Improvement failed");
    } finally {
      setImproving(false);
    }
  }, [article, selection, improveInstruction, editBody]);

  const handleApplySuggestion = useCallback(async () => {
    if (!selection || !suggestion) return;
    const currentText = editBody.slice(selection.from, selection.to);
    if (currentText !== suggestion.original) {
      setContentChanged(true);
      return;
    }
    setEditBody((prev) => prev.slice(0, selection.from) + suggestion.suggestion + prev.slice(selection.to));
    setSuggestion(null);
    setSelection(null);
    setImproveInstruction("Improve clarity");
  }, [selection, suggestion, editBody]);

  const handleRejectSuggestion = useCallback(() => {
    setSuggestion(null);
    setSelection(null);
    setImproveInstruction("Improve clarity");
  }, []);

  // Fallback textarea improve (sidebar)
  const [fallbackText, setFallbackText] = useState("");
  const handleFallbackImprove = useCallback(async () => {
    if (!article || !fallbackText.trim()) return;
    setImproving(true);
    setImproveError(null);
    setSuggestion(null);
    try {
      const result = await api.content.ai.improve(article.id, fallbackText, improveInstruction, "", "");
      setSuggestion(result);
    } catch (err: any) {
      setImproveError(err instanceof Error ? err.message : "Improvement failed");
    } finally {
      setImproving(false);
    }
  }, [article, fallbackText, improveInstruction]);

  // --- Lifecycle action buttons ---
  const lifecycleActions = useMemo(() => {
    if (!article) return null;
    const btnPrimary = "text-xs font-medium rounded-lg bg-[var(--tt-brand-color-500)] text-white px-3 py-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity";
    const btnSecondary = "text-xs font-medium rounded-lg border border-[var(--tt-border-color-tint)] px-3 py-1.5 text-[var(--tt-theme-text)] hover:bg-[var(--tt-gray-dark-a-100)] disabled:opacity-50 transition-colors";
    switch (article.status) {
      case "building":
        return (
          <button
            className={btnPrimary}
            onClick={() => doTransition("review")}
            disabled={transitioning === "review"}
          >
            {transitioning === "review" ? "..." : t("articles.send_to_review")}
          </button>
        );
      case "review":
        return (
          <div className="flex gap-2">
            <button
              className={btnSecondary}
              onClick={() => doTransition("building")}
              disabled={transitioning === "building"}
            >
              {transitioning === "building" ? "..." : t("articles.back_to_editing")}
            </button>
            <button
              className={btnPrimary}
              onClick={() => doTransition("ready")}
              disabled={transitioning === "ready"}
            >
              {transitioning === "ready" ? "..." : t("articles.mark_ready")}
            </button>
          </div>
        );
      case "ready":
        return (
          <div className="flex gap-2">
            <button
              className={btnSecondary}
              onClick={() => doTransition("building")}
              disabled={transitioning === "building"}
            >
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
        return <span className="text-xs text-[var(--tt-color-text-gray)]">{article.status}</span>;
    }
  }, [article, transitioning, doTransition, t]);

  // --- Status badge ---
  const statusBadge = useMemo(() => {
    if (!article) return null;
    const labels: Record<string, string> = {
      building: t("articles.status_building"),
      review: t("articles.status_review"),
      ready: t("articles.status_ready"),
      published: t("articles.status_published"),
    };
    return (
      <span className="inline-flex items-center rounded text-xs font-medium px-1.5 py-0.5 border border-[var(--tt-border-color-tint)] text-[var(--tt-color-text-gray)]">
        {labels[article.status] ?? article.status}
      </span>
    );
  }, [article, t]);

  // --- Loading state (new article creating) ---
  if (creating) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton skeleton-title w-48 h-6 rounded" />
        <div className="skeleton skeleton-card rounded-lg h-64" />
      </div>
    );
  }

  // --- Loading state (existing article) ---
  if (articleLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton skeleton-title w-48 h-6 rounded" />
        <div className="skeleton skeleton-card rounded-lg h-64" />
      </div>
    );
  }

  // --- Error state ---
  if (articleError) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="rounded-lg border border-[var(--color-accent-danger)]/30 bg-[var(--color-accent-danger)]/10 p-4 text-center text-[var(--color-accent-danger)]">
          {t("articles.load_error")}
        </div>
      </div>
    );
  }

  // --- Not found ---
  if (!isNew && !article) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-[var(--color-text-tertiary)]">
        {t("articles.not_found")}
      </div>
    );
  }

  // --- Editor ---
  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--tt-border-color-tint)] shrink-0">
        <button
          onClick={() => navigate({ to: "/library" })}
          className="flex items-center gap-1 text-xs text-[var(--tt-color-text-gray)] hover:text-[var(--tt-theme-text)] transition-colors"
        >
          <ArrowLeft size={14} /> {t("articles.back_to_library")}
        </button>
        <div className="flex items-center gap-3 text-xs">
          {statusBadge}
          {isSaving && <span className="text-[var(--tt-color-text-gray)]">{t("articles.saving")}</span>}
          {isSynced && <span className="text-[var(--tt-color-text-gray)]">{t("articles.synced")}</span>}
          {saveError && <span className="text-[var(--tt-color-text-red)]">{t("articles.save_error")}</span>}
        </div>
      </div>

      {/* Editor + Sidebar */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex-1 flex flex-col overflow-y-auto" style={{ minHeight: 0 }}>
          {article && contentLoaded && (
            <ContentEditor
              title={editTitle}
              onTitleChange={setEditTitle}
              body={editBody}
              onBodyChange={setEditBody}
              onSelectionChange={handleSelectionChange}
              editorKey={article.id}
              onTransform={() => {}}
              isSynced={isSynced}
              isSaving={isSaving}
              saveError={saveError}
              toolbarRight={selection ? (
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
              ) : undefined}
            />
          )}
          {contentLoaded && !editTitle && !editBody && !articleLoading && (
            <p className="pt-2 text-center text-xs text-[var(--color-text-tertiary)]">
              {t("articles.start_writing_prompt")}
            </p>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="hidden md:block md:w-56 lg:w-72 shrink-0 border-l border-[var(--tt-border-color-tint)] overflow-y-auto">
          <div className="p-3 space-y-3">
            {/* AI Editorial Assistance */}
            <div className="rounded-lg border border-[var(--tt-border-color-tint)] bg-[var(--tt-card-bg-color)] p-3 space-y-2.5">
              <h3 className="text-xs font-medium text-[var(--tt-color-text-gray)] uppercase tracking-wider">
                {t("articles.editorial_assistance")}
              </h3>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full text-xs font-medium rounded-lg border border-[var(--tt-border-color-tint)] bg-[var(--tt-card-bg-color)] px-3 py-1.5 text-[var(--tt-theme-text)] hover:bg-[var(--tt-gray-dark-a-100)] disabled:opacity-50 transition-colors"
              >
                {analyzing ? t("articles.analyzing") : t("articles.analyze_article")}
              </button>

              {analysisError && (
                <p className="text-xs text-[var(--color-accent-danger)]">{analysisError}</p>
              )}

              {analyzing && <p className="text-xs text-[var(--color-text-tertiary)] italic">{t("articles.analyzing")}</p>}

              {persistedAnalysis && !articleChangedSinceAnalysis && (
                <details className="group text-xs" open>
                  <summary className="cursor-pointer text-xs font-medium text-[var(--tt-color-text-gray)] hover:text-[var(--tt-theme-text)]">
                    Analysis · {persistedAnalysis.score}/100
                  </summary>
                  <div className="mt-2 space-y-2">
                    <p className="text-[var(--color-text-primary)]">{persistedAnalysis.summary}</p>
                    {persistedAnalysis.strengths.length > 0 && (
                      <div>
                        <p className="font-medium text-[var(--color-accent-success)]">Strengths</p>
                        <ul className="list-disc list-inside text-[var(--color-text-secondary)]">
                          {persistedAnalysis.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {persistedAnalysis.improvements.length > 0 && (
                      <div>
                        <p className="font-medium text-[var(--color-accent-warning)]">Improvements</p>
                        <ul className="list-disc list-inside text-[var(--color-text-secondary)]">
                          {persistedAnalysis.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    <p className="text-[var(--color-text-muted)]">
                      {t("articles.last_analyzed", { time: new Date(persistedAnalysis.created_at).toLocaleString() })}
                    </p>
                  </div>
                </details>
              )}

              {persistedAnalysis && articleChangedSinceAnalysis && (
                <div className="space-y-2 text-xs">
                  <p className="text-xs text-[var(--color-accent-warning)]">{t("articles.article_changed_since_analysis")}</p>
                  <button onClick={handleAnalyze} disabled={analyzing} className="btn-secondary w-full">
                    {t("articles.analyze_article")}
                  </button>
                </div>
              )}

              {!persistedAnalysis && !analyzing && (
                <p className="text-xs text-[var(--color-text-tertiary)]">{t("articles.analysis_unavailable")}</p>
              )}

              {/* Improve — only shown as fallback when no selection */}
              {!selection && (
                <>
                  <hr className="border-[var(--color-border)]/10" />
                  <details className="group text-xs">
                    <summary className="cursor-pointer text-xs font-medium text-[var(--tt-color-text-gray)] hover:text-[var(--tt-theme-text)]">
                      {t("articles.improve_text")}
                    </summary>
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={fallbackText}
                        onChange={(e) => setFallbackText(e.target.value)}
                        placeholder={t("articles.select_text_to_improve")}
                        rows={2}
                        className="w-full rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] resize-none"
                      />
                      <button
                        onClick={handleFallbackImprove}
                        disabled={improving || !fallbackText.trim()}
                        className="btn-secondary w-full"
                      >
                        {improving ? t("articles.improving") : t("articles.improve_with_ai")}
                      </button>
                      {improveError && !contentChanged && (
                        <p className="text-xs text-[var(--color-accent-danger)]">{improveError}</p>
                      )}
                      {contentChanged && (
                        <p className="text-xs text-[var(--color-accent-danger)]">{t("articles.content_changed")}</p>
                      )}
                    </div>
                  </details>
                </>
              )}
            </div>

            {/* References section */}
            <div className="rounded-lg border border-[var(--tt-border-color-tint)] bg-[var(--tt-card-bg-color)] p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-[var(--tt-color-text-gray)] uppercase tracking-wider">
                  {t("references.title")}
                </h3>
                <button
                  onClick={() => setShowAttachRef(true)}
                  className="text-xs font-medium text-[var(--tt-brand-color-500)] hover:underline transition-colors"
                >
                  {t("references.add")}
                </button>
              </div>
              <ReferenceList
                references={articleRefs}
                onRemove={handleDetachRef}
                compact
              />
            </div>
          </div>
        </aside>

        {showAttachRef && (
          <AttachReferenceModal
            existingReferences={articleRefs}
            onAttach={handleAttachRef}
            onDetach={handleDetachRef}
            onClose={() => setShowAttachRef(false)}
          />
        )}
      </div>

      {/* Lifecycle actions footer */}
      <div className="flex-wrap gap-2 shrink-0 flex items-center justify-between px-3 md:px-6 py-2 border-t border-[var(--tt-border-color-tint)]">
        <div className="text-xs text-[var(--tt-color-text-gray)]">
          {article && !suggestion && (
            article.status === "building" ? t("articles.lifecycle_help_building") :
            article.status === "review" ? t("articles.lifecycle_help_review") :
            article.status === "ready" ? t("articles.lifecycle_help_ready") :
            article.status === "published" ? t("articles.lifecycle_help_published") :
            null
          )}
        </div>
        <div className="flex items-center gap-2">
          {lifecycleActions}
        </div>
      </div>
      {/* AI Suggestion comparison modal */}
      {suggestion && (
        <SuggestionModal
          suggestion={suggestion}
          contentChanged={contentChanged}
          onReject={handleRejectSuggestion}
          onApply={handleApplySuggestion}
        />
      )}
    </div>  );
}
