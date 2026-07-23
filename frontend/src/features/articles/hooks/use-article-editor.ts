import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { api, type AITextSuggestion } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { useAutosave } from "../../../hooks/useAutosave";
import { detectFormat, htmlToMarkdown } from "../../../lib/markdown";

export type EditorMode = "visual" | "markdown" | "split" | "preview";

export function useArticleEditor() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isNew = !id || id === "new";

  /* ───── Article query ───── */
  const { data: article, isLoading: articleLoading, error: articleError } = useQuery({
    queryKey: queryKeys.content.byId(id ?? ""),
    queryFn: () => api.content.get(id!),
    enabled: !isNew && !!id,
  });

  /* ───── Create article on /new ───── */
  const [creating, setCreating] = useState(isNew);
  useEffect(() => {
    if (!isNew) return;
    let cancelled = false;
    api.content.create()
      .then((created) => {
        if (cancelled) return;
        setCreating(false);
        navigate({ to: `/content/articles/${created.id}/edit`, replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        setCreating(false);
      });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── Editor state ───── */
  const [contentLoaded, setContentLoaded] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState(""); // Markdown canonical
  const [contentVersion, setContentVersion] = useState(0);

  /* ───── Mode state ───── */
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [focusMode, setFocusMode] = useState(false);
  const toggleFocusMode = useCallback(() => setFocusMode((v) => !v), []);

  /* ───── Load article content ───── */
  useEffect(() => {
    if (article) {
      setEditTitle(article.title ?? "");
      const raw = article.body_markdown ?? "";
      // body_markdown might be HTML (legacy) or Markdown — convert to Markdown
      setEditBody(detectFormat(raw) === "html" ? htmlToMarkdown(raw) : raw);
      setContentLoaded(true);
    }
  }, [article]);

  /* ───── Visual mode: convert Tiptap HTML → Markdown ───── */
  const handleBodyHtmlChange = useCallback((html: string) => {
    const md = htmlToMarkdown(html);
    setEditBody(md);
  }, []);

  /* ───── Autosave ───── */
  const handleSave = useCallback(async () => {
    if (!article) return;
    await api.content.save(article.id, {
      title: editTitle || undefined,
      body_markdown: editBody || undefined, // editBody is already Markdown
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.content.byId(article.id) });
  }, [article, editTitle, editBody, queryClient]);

  const { isSynced, isSaving, error: saveError } = useAutosave({
    save: handleSave,
    deps: [editBody, editTitle],
    delay: 1500,
  });

  /* ───── Dirty tracking ───── */
  const [dirty, setDirty] = useState(false);
  const titleRef = useRef(editTitle);
  const bodyRef = useRef(editBody);
  useEffect(() => {
    titleRef.current = editTitle;
    bodyRef.current = editBody;
    setDirty(!isSynced);
  }, [editTitle, editBody, isSynced]);

  /* ───── Lifecycle transitions ───── */
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

  /* ───── References ───── */
  const [showAttachRef, setShowAttachRef] = useState(false);
  const { data: articleRefs = [] } = useQuery({
    queryKey: queryKeys.references.byContent(article?.id ?? ""),
    queryFn: () => api.references.listForContent(article!.id),
    enabled: !!article,
  });

  const attachRefMut = useMutation({
    mutationFn: (refId: string) => api.references.attachToContent(article!.id, refId),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: queryKeys.references.byContent(article?.id ?? ""),
    }),
  });
  const detachRefMut = useMutation({
    mutationFn: (refId: string) => api.references.detachFromContent(article!.id, refId),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: queryKeys.references.byContent(article?.id ?? ""),
    }),
  });

  const handleAttachRef = useCallback(async (refId: string) => {
    await attachRefMut.mutateAsync(refId);
    setShowAttachRef(false);
  }, [attachRefMut]);

  const handleDetachRef = useCallback(async (refId: string) => {
    await detachRefMut.mutateAsync(refId);
  }, [detachRefMut]);

  /* ───── AI Analysis ───── */
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
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [article, queryClient]);

  /* ───── AI Improve (selection-based) ───── */
  const [selection, setSelection] = useState<{ text: string; from: number; to: number } | null>(null);
  const handleSelectionChange = useCallback((text: string, from: number, to: number) => {
    if (text.trim()) setSelection({ text, from, to });
    else setSelection(null);
  }, []);

  const [improveInstruction, setImproveInstruction] = useState("Improve clarity");
  const [suggestion, setSuggestion] = useState<AITextSuggestion | null>(null);
  const [sentOriginal, setSentOriginal] = useState("");
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [contentChanged, setContentChanged] = useState(false);

  const handleImprove = useCallback(async () => {
    if (!article || !selection) return;
    setImproving(true);
    setImproveError(null);
    setSuggestion(null);
    setSentOriginal(selection?.text ?? "");
    setContentChanged(false);
    try {
      // Find selected text in canonical Markdown body (not position-based)
      let ctxBefore = "";
      let ctxAfter = "";
      const mdIdx = editBody.indexOf(selection.text);
      if (mdIdx >= 0) {
        const start = Math.max(0, mdIdx - 100);
        const end = Math.min(editBody.length, mdIdx + selection.text.length + 100);
        ctxBefore = editBody.slice(start, mdIdx);
        ctxAfter = editBody.slice(mdIdx + selection.text.length, end);
      }
      const result = await api.content.ai.improve(
        article.id, selection.text, improveInstruction, ctxBefore, ctxAfter,
      );
      setSuggestion(result);
    } catch (err: unknown) {
      setImproveError(err instanceof Error ? err.message : "Improvement failed");
    } finally {
      setImproving(false);
    }
  }, [article, selection, improveInstruction, editBody]);

  const handleApplySuggestion = useCallback(async () => {
    if (!suggestion || !sentOriginal) return;
    const idx = editBody.indexOf(sentOriginal);
    if (idx === -1) {
      setContentChanged(true);
      return;
    }
    setEditBody((prev) => prev.slice(0, idx) + suggestion.suggestion + prev.slice(idx + sentOriginal.length));
    setContentVersion((v) => v + 1);
    setSuggestion(null);
    setSelection(null);
    setImproveInstruction("Improve clarity");
  }, [suggestion, editBody]);

  const handleRejectSuggestion = useCallback(() => {
    setSuggestion(null);
    setSelection(null);
    setImproveInstruction("Improve clarity");
  }, []);

  /* ───── Fallback textarea improve ───── */
  const [fallbackText, setFallbackText] = useState("");
  const handleFallbackImprove = useCallback(async () => {
    if (!article || !fallbackText.trim()) return;
    setImproving(true);
    setImproveError(null);
    setSuggestion(null);
    try {
      const result = await api.content.ai.improve(article.id, fallbackText, improveInstruction, "", "");
      setSuggestion(result);
    } catch (err: unknown) {
      setImproveError(err instanceof Error ? err.message : "Improvement failed");
    } finally {
      setImproving(false);
    }
  }, [article, fallbackText, improveInstruction]);

  return {
    /* Data */
    article, articleLoading, articleError, isNew,
    creating,
    /* Editor */
    editTitle, setEditTitle,
    editBody, setEditBody,
    contentLoaded, contentVersion,
    handleBodyHtmlChange,
    /* Mode */
    editorMode, setEditorMode,
    focusMode, toggleFocusMode,
    /* Autosave */
    isSynced, isSaving, saveError, dirty,
    handleSave,
    /* Transitions */
    transitioning, doTransition,
    /* References */
    showAttachRef, setShowAttachRef, articleRefs,
    handleAttachRef, handleDetachRef,
    /* AI Analysis */
    persistedAnalysis, analyzing, analysisError,
    articleChangedSinceAnalysis, handleAnalyze,
    /* AI Improve */
    selection, handleSelectionChange,
    improveInstruction, setImproveInstruction,
    suggestion, improving, improveError,
    contentChanged,
    handleImprove, handleApplySuggestion, handleRejectSuggestion,
    /* Fallback */
    fallbackText, setFallbackText, handleFallbackImprove,
    /* Navigation */
    navigate,
  };
}
