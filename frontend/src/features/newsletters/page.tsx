import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { NewsletterListCard } from "./components/newsletter-list-card";
import { NewsletterDetailPanel } from "./components/detail-panel";
import { NewslettersToolbar } from "./components/newsletters-toolbar";
import { PreviewOverlay } from "./components/preview-overlay";
import { useNewslettersPage } from "./hooks/use-newsletters-page";

export function NewslettersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    selectedItem, articles, removingArticle, generating,
    showPreview, setShowPreview, previewItem, setPreviewItem, activeTab, setActiveTab,
    sortBy, setSortBy, confirmDialog, setConfirmDialog,
    isLoading, isError, sortedItems, items,
    buildingCount, readyCount, publishedCount, archivedCount,
    tabCounts, sortOptions, newsletterTabs,
    handleCreate, handleSelect, handleEditNavigation, handlePreview,
    handleDuplicate, handleCloseDetailPanel, handleArchive, handleUnarchive,
    handleStatusChange, handleCategoryChange, handleDestinationChange,
    handleAddArticle, handleRemoveArticle, handleGenerateIntro,
  } = useNewslettersPage();

  // --- Error state ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-danger)]/15">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent-danger)]"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="mb-1 text-base font-medium text-[var(--color-bg-surface)]">{t("newsletters.failedToLoad")}</h2>
        <p className="mb-4 text-xs text-[var(--color-text-muted)]">{t("newsletters.tryAgainLater")}</p>
      </div>
    );
  }

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="skeleton skeleton-title !mb-0 !h-8 w-48" />
          <div className="skeleton !mb-0 !h-9 w-32 rounded-lg" />
        </div>
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton skeleton-text !w-20 rounded-full" />
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card rounded-lg" style={{ height: 96 }} />
          ))}
        </div>
      </div>
    );
  }

  // --- Main view ---
  return (
    <>
      <div className="flex h-full flex-col p-6 animate-[fadeIn_400ms_ease-out_forwards]">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl font-bold leading-tight text-[var(--color-bg-surface)]">
              {t("newsletters.title")}
            </h1>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent-primary)]" />
                {buildingCount} {t("newsletters.building").toLowerCase()}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent-success)]" />
                {readyCount} {t("newsletters.ready").toLowerCase()}
              </span>
              <span className="text-[var(--color-text-muted)]/50">·</span>
              <span>{publishedCount} {t("newsletters.published").toLowerCase()}</span>
              <span>{archivedCount} {t("newsletters.archived").toLowerCase()}</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <NewslettersToolbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sortBy={sortBy}
          setSortBy={setSortBy as (v: string) => void}
          sortOptions={sortOptions}
          newsletterTabs={newsletterTabs}
          tabCounts={tabCounts}
          onCreate={handleCreate}
        />

        {/* Main content: list + detail panel */}
        <div className="flex flex-1 gap-0 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Card list */}
          <div className="min-w-0 flex-1 overflow-y-auto pr-4">
            {sortedItems.length === 0 ? (
              <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
                {items.length === 0 ? (
                  <>
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent-primary)]/20 to-[var(--color-accent-primary)]/5 shadow-inner shadow-white/[0.03]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent-primary)]">
                        <path d="M22 10.5V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <p className="mb-5 text-sm text-[var(--color-text-muted)]">{t("newsletters.noNewsletters")}</p>
                    <button
                      onClick={handleCreate}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-[var(--color-accent-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-primary)]/20 transition-all hover:bg-[var(--color-accent-primary)]/90 hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/25 hover:scale-[1.05] active:scale-[0.95]"
                    >
                      <Plus size={17} strokeWidth={2.5} />
                      {t("newsletters.newNewsletter")}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t("newsletters.noNewslettersInStage")}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className="opacity-0 animate-[fadeIn_400ms_ease-out_forwards]"
                  >
                    <NewsletterListCard
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onClick={handleSelect}
                      onEdit={handleEditNavigation}
                      onDuplicate={handleDuplicate}
                      onPreview={handlePreview}
                      onArchive={handleArchive}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedItem && (
            <NewsletterDetailPanel
              item={selectedItem}
              articles={articles}
              removingArticle={removingArticle}
              generating={generating}
              onClose={handleCloseDetailPanel}
              onEdit={() => handleEditNavigation()}
              onPreview={() => handlePreview()}
              onDuplicate={handleDuplicate}
              onStatusChange={handleStatusChange}
              onCategoryChange={handleCategoryChange}
              onRemoveArticle={handleRemoveArticle}
              onAddArticle={handleAddArticle}
              onGenerateIntro={handleGenerateIntro}
              onDestinationChange={handleDestinationChange}
              onNavigateToDiscover={() => navigate({ to: "/discover" })}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
            />
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmDialog !== null}
        message={confirmDialog?.message ?? ""}
        onConfirm={() => { confirmDialog?.onConfirm(); }}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Preview overlay */}
      {showPreview && previewItem && (
        <PreviewOverlay
          item={previewItem}
          onClose={() => { setShowPreview(false); setPreviewItem(null); }}
          onEdit={(item) => handleEditNavigation(item)}
          onArchive={handleArchive}
        />
      )}
    </>
  );
}
