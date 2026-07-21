import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContentEditor } from "../../components/editor/ContentEditor";
import { AttachReferenceModal, ReferenceList } from "../references/ReferencesPage";
import { SuggestionModal } from "./SuggestionModal";
import { useArticleEditor } from "./hooks/use-article-editor";

export function ArticleEditorPage() {
  const { t } = useTranslation();
  const {
    article, articleLoading, articleError, isNew, creating,
    editTitle, setEditTitle, editBody, setEditBody,
    contentLoaded, contentVersion,
    isSynced, isSaving, saveError,
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

  // --- Lifecycle action buttons ---
  const lifecycleActions = (() => {
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
            <button className={btnSecondary} onClick={() => doTransition("building")} disabled={transitioning === "building"}>
              {transitioning === "building" ? "..." : t("articles.back_to_editing")}
            </button>
            <button className={btnPrimary} onClick={() => doTransition("ready")} disabled={transitioning === "ready"}>
              {transitioning === "ready" ? "..." : t("articles.mark_ready")}
            </button>
          </div>
        );
      case "ready":
        return (
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={() => doTransition("building")} disabled={transitioning === "building"}>
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
  })();

  // --- Status badge ---
  const statusBadge = (() => {
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
  })();

  // --- Loading / Error / Empty states ---
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

  // --- Editor ---
  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--tt-border-color-tint)] shrink-0">
        <button
          onClick={() => navigate({ to: "/content/articles" })}
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
              editorKey={`${article.id}-${contentVersion}`}
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

              {/* Fallback improve */}
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
              <ReferenceList references={articleRefs} onRemove={handleDetachRef} compact />
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
