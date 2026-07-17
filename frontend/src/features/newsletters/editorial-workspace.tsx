import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PanelRight } from "lucide-react";
import { useCallback } from "react";
import { useEditorWorkspace } from "./hooks/use-editor-workspace";
import { WorkspaceHeader } from "./components/workspace-header";
import { EditorSidebar } from "./components/editor-sidebar";
import { ContentEditor } from "../../components/editor/ContentEditor";
import { PreviewOverlay } from "./components/preview-overlay";

export function EditorialWorkspace() {
  const { t } = useTranslation();
  const params = useParams({ from: "/auth-layout/content/newsletters/$id/edit" });
  const editionId = params.id as string;
  const hook = useEditorWorkspace(editionId);

  const edition = hook.edition;

  const toggleSidebar = useCallback(() => {
    if (hook.sidebarVisible) {
      hook.setSidebarVisible(false);
    } else {
      hook.setSidebarTab("ai");
      hook.setSidebarVisible(true);
    }
  }, [hook.sidebarVisible]);

  if (hook.isLoading || !edition) {
    return (
      <div className="flex h-full flex-col gap-3 p-4 lg:p-6">
        <div className="h-10 animate-pulse rounded-lg bg-white/5" />
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex min-w-0 flex-1 animate-pulse flex-col gap-3 rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02] p-6">
            <div className="h-8 w-1/3 rounded bg-white/5" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-3.5 rounded bg-white/5" style={{ width: `${70 + i * 4}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col animate-[fadeIn_400ms_ease-out_forwards]">
      <WorkspaceHeader
        edition={edition}
        isSynced={hook.isSynced}
        isSaving={hook.isSaving}
        saveError={hook.saveError}
        onBack={hook.handleBack}
        onStatusChange={hook.handleStatusChange}
        onDuplicate={hook.handleDuplicate}
        onArchive={() => hook.handleStatusChange("archived")}
        onUnarchive={hook.handleUnarchive}
      />

      {/* Main workspace: editor + sidebar */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Editor */}
        <main className="flex min-w-0 flex-1 flex-col">
          <ContentEditor
            title={hook.editTitle}
            onTitleChange={hook.setEditTitle}
            subtitle={hook.editSubtitle}
            onSubtitleChange={hook.setEditSubtitle}
            body={hook.editBody}
            onBodyChange={hook.setEditBody}
            editorKey={`${edition.id}-v${hook.bodyVersion}`}
            titlePlaceholder={t("newsletters.titlePlaceholder")}
            subtitlePlaceholder={t("newsletters.subtitlePlaceholder")}
            toolbarRight={
              <button
                onClick={toggleSidebar}
                className={`cursor-pointer rounded-md p-1.5 transition-colors ${
                  hook.sidebarVisible
                    ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
                }`}
                aria-label={t("newsletters.ai")}
              >
                <PanelRight size={15} />
              </button>
            }
          />
        </main>

        {/* Sidebar */}
        <aside
          className={`overflow-hidden transition-all duration-[var(--duration-base)] ${
            hook.sidebarVisible
              ? "hidden w-72 shrink-0 border-l border-[var(--color-border)]/10 lg:flex lg:flex-col"
              : "hidden lg:hidden"
          }`}
        >
          <EditorSidebar
            articles={hook.articles}
            availableArticles={hook.availableArticles}
            activeTab={hook.sidebarTab}
            onTabChange={hook.setSidebarTab}
            onClose={() => hook.setSidebarVisible(false)}
            onAddArticle={hook.handleAddArticle}
            onRemoveArticle={hook.handleRemoveArticle}
            removingArticle={hook.removingArticle}
            onGenerateIntro={hook.handleGenerateIntro}
            generating={hook.generating}
          />
        </aside>
      </div>

      {/* Mobile drawer */}
      {hook.sidebarVisible && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden animate-[fadeIn_200ms_ease-out_forwards]"
            onClick={() => hook.setSidebarVisible(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[90vw] flex-col overflow-hidden border-l border-[var(--color-border)]/10 bg-[var(--color-bg-base)] lg:hidden animate-[slideUp_250ms_ease-out_forwards]"
            role="dialog"
            aria-modal="true"
            aria-label={t("newsletters.ai")}
          >
            <EditorSidebar
              articles={hook.articles}
              availableArticles={hook.availableArticles}
              activeTab={hook.sidebarTab}
              onTabChange={hook.setSidebarTab}
              onClose={() => hook.setSidebarVisible(false)}
              onAddArticle={hook.handleAddArticle}
              onRemoveArticle={hook.handleRemoveArticle}
              removingArticle={hook.removingArticle}
              onGenerateIntro={hook.handleGenerateIntro}
              generating={hook.generating}
            />
          </div>
        </>
      )}

      {/* Preview overlay */}
      {hook.showPreview && (
        <PreviewOverlay
          edition={edition}
          onClose={() => hook.setShowPreview(false)}
          onStatusChange={hook.handleStatusChange}
        />
      )}
    </div>
  );
}
