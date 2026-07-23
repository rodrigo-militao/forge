import { useTranslation } from "react-i18next";
import { EditorWorkspace } from "./components/EditorWorkspace";
import { useArticleEditor } from "./hooks/use-article-editor";

export function ArticleEditorPage() {
  const { t } = useTranslation();
  const {
    article, articleLoading, articleError, isNew, creating,
    editTitle, setEditTitle, editBody, setEditBody,
    contentLoaded, contentVersion, handleBodyHtmlChange,
    editorMode, setEditorMode, focusMode, toggleFocusMode,
    isSynced, isSaving, saveError, dirty,
    handleSave,
    transitioning, doTransition,
    showAttachRef, setShowAttachRef, articleRefs,
    handleAttachRef, handleDetachRef,
    persistedAnalysis, analyzing, analysisError,
    articleChangedSinceAnalysis, handleAnalyze,
    selection, handleSelectionChange,
    improveInstruction, setImproveInstruction,
    suggestion, improving, improveError, contentChanged,
    handleImprove, handleApplySuggestion, handleRejectSuggestion,
    fallbackText, setFallbackText, handleFallbackImprove,
    navigate,
  } = useArticleEditor();

  // ─── Loading / Error / Empty states ───
  if (creating) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton skeleton-title w-48 h-6 rounded" />
        <div className="skeleton skeleton-card rounded-lg h-64" />
      </div>
    );
  }

  if (articleLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton skeleton-title w-48 h-6 rounded" />
        <div className="skeleton skeleton-card rounded-lg h-64" />
      </div>
    );
  }

  if (articleError) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="rounded-lg border border-[var(--color-accent-danger)]/30 bg-[var(--color-accent-danger)]/10 p-4 text-center text-[var(--color-accent-danger)]">
          {t("articles.load_error")}
        </div>
      </div>
    );
  }

  if (!isNew && !article) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-[var(--color-text-tertiary)]">
        {t("articles.not_found")}
      </div>
    );
  }

  // ─── Editor ───
  return (
    <EditorWorkspace
      article={article!}
      contentLoaded={contentLoaded}
      editTitle={editTitle}
      setEditTitle={setEditTitle}
      editBody={editBody}
      setEditBody={setEditBody}
      handleBodyHtmlChange={handleBodyHtmlChange}
      contentVersion={contentVersion}
      editorMode={editorMode}
      setEditorMode={setEditorMode}
      focusMode={focusMode}
      toggleFocusMode={toggleFocusMode}
      isSynced={isSynced}
      isSaving={isSaving}
      saveError={saveError}
      dirty={dirty}
      handleSave={handleSave}
      transitioning={transitioning}
      doTransition={doTransition}
      showAttachRef={showAttachRef}
      setShowAttachRef={setShowAttachRef}
      articleRefs={articleRefs}
      handleAttachRef={handleAttachRef}
      handleDetachRef={handleDetachRef}
      persistedAnalysis={persistedAnalysis}
      analyzing={analyzing}
      analysisError={analysisError}
      articleChangedSinceAnalysis={articleChangedSinceAnalysis}
      handleAnalyze={handleAnalyze}
      selection={selection}
      handleSelectionChange={handleSelectionChange}
      improveInstruction={improveInstruction}
      setImproveInstruction={setImproveInstruction}
      suggestion={suggestion}
      improving={improving}
      improveError={improveError}
      contentChanged={contentChanged}
      handleImprove={handleImprove}
      handleApplySuggestion={handleApplySuggestion}
      handleRejectSuggestion={handleRejectSuggestion}
      fallbackText={fallbackText}
      setFallbackText={setFallbackText}
      handleFallbackImprove={handleFallbackImprove}
      navigate={navigate}
    />
  );
}
