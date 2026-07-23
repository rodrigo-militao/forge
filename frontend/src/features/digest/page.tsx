import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import { formatTimeAgo } from "../../lib/time";
import { useDigestPage } from "./hooks/use-digest-page";
import { capitalize, jobTypeDisplayName, StatusDot } from "./helpers";
import { StatsBar } from "./components/stats-bar";
import { DigestToolbar } from "./components/digest-toolbar";
import { DigestArticleList } from "./components/digest-article-list";
import { NewsletterSelector } from "./components/newsletter-selector";
import { DetailPanel } from "./components/detail-panel";

/* ───── page component ───── */

export function DigestPage() {
  const { t } = useTranslation();
  const {
    running, selectedIDs, setSelectedIDs, activeTab, setActiveTab, sortBy, setSortBy,
    selectedArticle, setSelectedArticle, showJobs, setShowJobs,
    newsletterAnchor, selectorRef, draftNewsletters, creatingNewsletter,
    isLoading, isError, stats, jobs,
    digestItems, filteredByTab, tabCounts, sortOptions, digestTabs, contextualTipKey,
    usedSet, stepLabel,
    toggleSelected, handleCardClick, openNewsletterSelector,
    addToNewsletter, createAndAddToNewsletter, handleDelete,
    handleCreateArticle, handleCreateIdea, handleRun,
  } = useDigestPage();

  /* ───── loading / error ───── */

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-lg text-[var(--color-accent-danger)]">Failed to load content</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Try refreshing the page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-8">
        <div className="flex items-center justify-between">
          <div className="skeleton skeleton-title" />
          <div className="flex gap-2">
            <div className="skeleton skeleton-card !mb-0 !h-9 w-20 rounded-lg" />
            <div className="skeleton skeleton-card !mb-0 !h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <div className="skeleton skeleton-text !w-16 rounded-full" />
          <div className="skeleton skeleton-text !w-20 rounded-full" />
          <div className="skeleton skeleton-text !w-14 rounded-full" />
        </div>
        <div className="mt-5 space-y-3">
          <div className="skeleton skeleton-card rounded-lg" />
          <div className="skeleton skeleton-card rounded-lg" />
          <div className="skeleton skeleton-card rounded-lg" />
        </div>
      </div>
    );
  }

  /* ───── render ───── */

  return (
    <div className="flex h-full flex-col px-8">
      {/* Header */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl font-bold leading-tight text-[var(--color-bg-surface)]">
            {t("digest.title")}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            {t("digest.waitingForReview", { count: tabCounts.novos })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={running}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          >
            <Sparkles size={16} className={running ? "animate-[spin_2s_linear_infinite]" : ""} />
            {running ? t("digest.running") : t("digest.discoverArticles")}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-4 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
        <StatsBar stats={stats} selectedCount={selectedIDs.size} />
      </div>

      {/* Jobs section */}
      {jobs && jobs.length > 0 && (
        <div className="mt-3 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
          <button
            onClick={() => setShowJobs(!showJobs)}
            className="flex cursor-pointer items-center gap-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-bg-surface)]"
          >
            <ChevronRight size={12} className={`transition-transform ${showJobs ? "rotate-90" : ""}`} />
            {t("digest.jobsTitle")} · {t(`digest.job${capitalize(jobs[0].status)}`)} · {formatTimeAgo(jobs[0].created_at, t)}
          </button>
          {showJobs && (
            <div className="mt-2 space-y-1 rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02] p-2">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center gap-2 text-xs">
                  <StatusDot status={job.status} />
                  <span className="font-medium text-[var(--color-bg-surface)]">{jobTypeDisplayName(job.type, t)}</span>
                  <span className="text-[var(--color-text-muted)]">{t(`digest.job${capitalize(job.status)}`)}</span>
                  {job.error && <span className="text-[var(--color-accent-danger)]" title={job.error}>!</span>}
                  <span className="ml-auto text-[var(--color-text-muted)]">
                    {formatTimeAgo(job.created_at, t)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <DigestToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sortBy={sortBy}
        setSortBy={setSortBy as (v: string) => void}
        sortOptions={sortOptions}
        digestTabs={digestTabs}
        tabCounts={tabCounts}
        selectedIDs={selectedIDs}
        openNewsletterSelector={openNewsletterSelector}
      />

      {/* Main content area */}
      <div className="mt-4 flex flex-1 gap-0">
        <DigestArticleList
          sortedItems={filteredByTab}
          digestItems={digestItems}
          selectedIDs={selectedIDs}
          setSelectedIDs={setSelectedIDs}
          toggleSelected={toggleSelected}
          handleRun={handleRun}
          handleCardClick={handleCardClick}
          openNewsletterSelector={openNewsletterSelector}
          handleDelete={handleDelete}
          handleCreateArticle={handleCreateArticle}
          handleCreateIdea={handleCreateIdea}
          usedSet={usedSet}
          activeTab={activeTab}
          running={running}
          contextualTipKey={contextualTipKey}
          stepLabel={stepLabel}
          sortBy={sortBy}
        />

        {/* Detail panel */}
        {selectedArticle && (
          <div className="mr-2 mb-2 sticky top-0 self-start animate-[slideInRight_200ms_ease-out]">
            <DetailPanel
              item={selectedArticle}
              isSelected={selectedIDs.has(selectedArticle.id)}
              isUsed={usedSet.has(selectedArticle.id)}
              onClose={() => setSelectedArticle(null)}
              onToggleSelect={toggleSelected}
              onAddToNewsletter={(id, e) => openNewsletterSelector(id, e)}
            />
          </div>
        )}
      </div>

      {/* Newsletter selector popover */}
      {newsletterAnchor && (
        <NewsletterSelector
          ref={selectorRef}
          top={newsletterAnchor.top}
          right={newsletterAnchor.right}
          newsletters={draftNewsletters}
          creating={creatingNewsletter}
          onSelect={(id) => addToNewsletter(id, newsletterAnchor.articleId)}
          onCreateNew={() => createAndAddToNewsletter(newsletterAnchor.articleId)}
        />
      )}
    </div>
  );
}
