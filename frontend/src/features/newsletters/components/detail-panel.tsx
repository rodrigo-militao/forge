import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ExternalLink, ArrowRight, FileText, Clock, AlignLeft, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { NewsletterEdition, ArticleRef } from "../../../api/client";
import { api } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { formatTimeAgo } from "../../../lib/time";
import { PipelineProgress, getStage, statusConfig } from "./detail-panel-pipeline";
import { StageSection, AvailableArticles, CopyButton } from "./detail-panel-articles";
import { DetailPanelCta } from "./detail-panel-cta";
import { DestinationEditor } from "./destination-editor";

interface NewsletterDetailPanelProps {
  item: NewsletterEdition;
  articles: ArticleRef[];
  removingArticle: string | null;
  generating: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: (item: NewsletterEdition) => void;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string | null) => void;
  onRemoveArticle: (contentID: string) => void;
  onAddArticle: (contentID: string) => Promise<void>;
  onGenerateIntro: () => void;
  onDestinationChange: (destination: string | null) => void;
  onNavigateToDiscover: () => void;
  onArchive: (item: NewsletterEdition) => void;
  onUnarchive: () => void;
}

export function NewsletterDetailPanel({
  item,
  articles,
  removingArticle,
  generating,
  onClose,
  onEdit,
  onPreview,
  onDuplicate,
  onStatusChange,
  onCategoryChange,
  onRemoveArticle,
  onAddArticle,
  onGenerateIntro,
  onDestinationChange,
  onNavigateToDiscover,
  onArchive,
  onUnarchive,
}: NewsletterDetailPanelProps) {
  const { t } = useTranslation();
  const [editingCategory, setEditingCategory] = useState(false);
  const [catValue, setCatValue] = useState(item.category ?? "");
  const [scrollFade, setScrollFade] = useState(false);
  const [stayInDiscover, setStayInDiscover] = useState(false);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const prevStageRef = useRef(getStage(item));
  const scrollRef = useRef<HTMLDivElement>(null);

  const naturalStage = getStage(item);
  const stage = stayInDiscover ? "discover" : naturalStage;
  const cfg = statusConfig[item.status] ?? statusConfig.building;

  // Track natural stage transitions
  useEffect(() => {
    if (prevStageRef.current === "discover" && naturalStage !== "discover") {
      setStayInDiscover(true);
    }
    if (prevStageRef.current !== "discover" && naturalStage === "discover") {
      setStayInDiscover(false);
    }
    prevStageRef.current = naturalStage;
  }, [naturalStage]);

  useEffect(() => {
    setStayInDiscover(false);
  }, [item.id]);

  // Available content items
  const { data: allContent } = useQuery({
    queryKey: queryKeys.content.all,
    queryFn: api.content.list,
  });
  const { data: articleIDsInAnyNewsletter } = useQuery({
    queryKey: queryKeys.articleNewsletterIds.all,
    queryFn: api.digest.articleNewsletterIDs,
  });
  const articleIDsInEdition = new Set(articles.map((a) => a.content_id));
  const usedIDs = new Set([...articleIDsInEdition, ...(articleIDsInAnyNewsletter ?? [])]);
  const availableArticles = (allContent ?? []).filter(
    (c) => c.deleted_at === null && !usedIDs.has(c.id)
  );

  // Scroll fade detection
  const checkScrollFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = el.scrollHeight > el.clientHeight;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setScrollFade(canScroll && !atBottom);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollFade();
    const observer = new ResizeObserver(() => checkScrollFade());
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkScrollFade, item.id]);

  // Review checklist items
  const checklist = [
    { label: t("newsletters.articlesSelected"), done: item.article_count > 0, detail: `${item.article_count} ${t("newsletters.articles")}` },
    { label: t("newsletters.bodyWritten"), done: item.body_html.length > 0 },
    { label: t("newsletters.destinationConfigured"), done: !!item.destination },
    { label: t("newsletters.categorySet"), done: !!item.category },
  ];
  const allChecksPass = checklist.every((c) => c.done);

  // Word count
  const wordCount = item.body_html
    ? item.body_html.replace(/<[^>]*>/g, "").trim().split(/\s+/).filter(Boolean).length
    : 0;

  // Tags section
  const tagsSection = item.tags.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {item.tags.map((tag) => (
        <span key={tag} className="rounded-full bg-[var(--color-accent-primary)]/20 px-2 py-0.5 text-[11px] text-[var(--color-accent-primary)]">
          {tag}
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative flex w-[400px] shrink-0 flex-col max-h-[75vh] rounded-lg border border-[var(--color-border)]/20 bg-white/5 shadow-lg">
      <div
        ref={scrollRef}
        onScroll={checkScrollFade}
        className="panel-scroll flex-1 overflow-y-auto p-5 pb-3"
      >
        {/* Pipeline */}
        <PipelineProgress item={item} />

        {/* Stats summary bar */}
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5 text-[11px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <FileText size={13} />
            {item.article_count} {item.article_count === 1 ? t("newsletters.article") : t("newsletters.articles")}
          </span>
          <span className="text-[var(--color-text-muted)]/30">|</span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {formatTimeAgo(item.updated_at, t)}
          </span>
          {wordCount > 0 && (
            <>
              <span className="text-[var(--color-text-muted)]/30">|</span>
              <span className="flex items-center gap-1.5">
                <AlignLeft size={13} />
                ~{wordCount} {t("newsletters.words")}
              </span>
            </>
          )}
        </div>

        {/* Status + Title row */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-semibold leading-snug text-[var(--color-bg-surface)]">
              {item.title || t("newsletters.noTitle")}
            </h2>
            <span className={`mt-1.5 inline-block rounded px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}>
              {t(cfg.labelKey)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={onClose} className="cursor-pointer rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ===== STAGE: DISCOVER ===== */}
        {stage === "discover" && (
          <>
            <p className="mb-3 text-sm text-[var(--color-bg-surface)]/80">{t("newsletters.discoverDesc")}</p>
            <AvailableArticles availableArticles={availableArticles} onAddArticle={onAddArticle} />
            <button
              onClick={onNavigateToDiscover}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/10 px-4 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/20 active:scale-[0.97]"
            >
              <ExternalLink size={15} />
              {t("newsletters.discoverWeb")}
            </button>
            {articles.length > 0 && (
              <button
                onClick={() => setStayInDiscover(false)}
                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
              >
                <ArrowRight size={16} />
                {t("newsletters.continueToCompose")}
              </button>
            )}
          </>
        )}

        {/* ===== STAGE: COMPOSE ===== */}
        {stage === "compose" && (
          <>
            <StageSection label={t("newsletters.checklist")}>
              <div className="space-y-2">
                {checklist.map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      c.done ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]" : "bg-white/[0.04] text-[var(--color-text-muted)]"
                    }`}>
                      {c.done ? <Check size={10} strokeWidth={3} /> : <span className="text-[10px]">•</span>}
                    </div>
                    <span className={`text-xs ${c.done ? "text-[var(--color-bg-surface)]/80" : "text-[var(--color-text-muted)]"}`}>
                      {c.label}{c.detail && ` — ${c.detail}`}
                    </span>
                  </div>
                ))}
              </div>
            </StageSection>

            <StageSection label={`${t("newsletters.selectedArticles")} (${articles.length})`}>
              {articles.length > 0 ? (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {articles.map((a) => (
                    <div key={a.content_id}>
                      <div
                        onClick={() => setExpandedArticle(expandedArticle === a.content_id ? null : a.content_id)}
                        className="group flex cursor-pointer items-center justify-between rounded-md bg-white/[0.04] px-2.5 py-1.5 transition-colors hover:bg-white/[0.08]"
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className="truncate text-xs text-[var(--color-bg-surface)] group-hover:text-[var(--color-accent-primary)]">{a.title || t("newsletters.noTitle")}</span>
                          {(() => {
                            const ci = allContent?.find((c) => c.id === a.content_id);
                            const url = ci?.metadata?.source_url as string | undefined;
                            return url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0 rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-all hover:text-[var(--color-accent-primary)] group-hover:opacity-100">
                                <ExternalLink size={11} />
                              </a>
                            ) : null;
                          })()}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemoveArticle(a.content_id); }}
                          disabled={removingArticle === a.content_id}
                          className="ml-1 cursor-pointer shrink-0 rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-danger)]/20 hover:text-[var(--color-accent-danger)] disabled:opacity-50"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      {expandedArticle === a.content_id && a.body_markdown && (
                        <div className="mt-1.5 rounded-lg border border-[var(--color-border)]/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-[var(--color-bg-surface)]/80">
                          <p className="whitespace-pre-wrap">{a.body_markdown}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">{t("newsletters.noArticlesYet")}</p>
              )}
            </StageSection>

            <AvailableArticles availableArticles={availableArticles} onAddArticle={onAddArticle} />

            <button
              onClick={onGenerateIntro}
              disabled={generating}
              className="mb-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/20 active:scale-[0.97] disabled:opacity-60"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-[dotPulse_1.4s_ease-out_infinite]" />
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-[dotPulse_1.4s_ease-out_infinite_200ms]" />
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-[dotPulse_1.4s_ease-out_infinite_400ms]" />
                  </span>
                  {t("newsletters.generatingIntro")}
                </span>
              ) : t("newsletters.generateIntroBtn")}
            </button>

            <StageSection label={t("newsletters.settings")} defaultCollapsed>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("newsletters.destination")}</label>
                <DestinationEditor value={item.destination} onChange={onDestinationChange} placeholder={t("newsletters.setDestination")} />
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("newsletters.category")}</label>
                {editingCategory ? (
                  <input
                    type="text"
                    value={catValue}
                    onChange={(e) => setCatValue(e.target.value)}
                    onBlur={() => { setEditingCategory(false); onCategoryChange(catValue || null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { setEditingCategory(false); onCategoryChange(catValue || null); }
                      if (e.key === "Escape") { setEditingCategory(false); setCatValue(item.category ?? ""); }
                    }}
                    className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)]/30"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => { setEditingCategory(true); setCatValue(item.category ?? ""); }}
                    className="flex w-full cursor-pointer items-center rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent-primary)]/30 hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
                  >
                    {item.category || t("newsletters.setCategory")}
                  </button>
                )}
              </div>
              {tagsSection && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("newsletters.topics")}</label>
                  {tagsSection}
                </div>
              )}
            </StageSection>

            <StageSection label={t("newsletters.export")} defaultCollapsed>
              <div className="flex flex-wrap gap-2">
                <CopyButton getContent={() => item.body_html} label={t("newsletters.copyAsHtml")} />
                <CopyButton getContent={() => item.body_html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()} label={t("newsletters.copyAsText")} />
              </div>
            </StageSection>
          </>
        )}

        {/* ===== STAGE: READY ===== */}
        {stage === "ready" && (
          <>
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-[var(--color-accent-success)]/40 bg-[var(--color-accent-success)]/15 px-4 py-3 text-sm font-semibold text-[var(--color-accent-success)] shadow-sm shadow-[var(--color-accent-success)]/10">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-success)]/20">
                <Check size={14} strokeWidth={3.5} />
              </div>
              {t("newsletters.readyToPublish")}
            </div>
            {item.destination && (
              <p className="mb-4 text-xs text-[var(--color-bg-surface)]/80">
                {t("newsletters.publishingTo")} <strong className="text-[var(--color-bg-surface)]">{item.destination}</strong>
                {item.article_count > 0 && ` · ${item.article_count} ${t("newsletters.articles")}`}
              </p>
            )}
            {tagsSection && <StageSection label={t("newsletters.topics")}>{tagsSection}</StageSection>}
            <StageSection label={t("newsletters.export")}>
              <div className="flex flex-wrap gap-2">
                <CopyButton getContent={() => item.body_html} label={t("newsletters.copyAsHtml")} />
                <CopyButton getContent={() => item.body_html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()} label={t("newsletters.copyAsText")} />
              </div>
            </StageSection>
          </>
        )}

        {/* ===== STAGE: PUBLISHED ===== */}
        {stage === "published" && (
          <>
            <div className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                {t("newsletters.publishedOn")} {new Date(item.updated_at).toLocaleDateString()}
              </p>
              {item.destination && <p className="mt-0.5 text-xs text-[var(--color-bg-surface)]/80">{item.destination}</p>}
              {item.article_count > 0 && <p className="mt-0.5 text-xs text-[var(--color-bg-surface)]/60">{t("newsletters.article", { count: item.article_count })}</p>}
            </div>
            {tagsSection && <StageSection label={t("newsletters.topics")}>{tagsSection}</StageSection>}
          </>
        )}

        {/* ===== STAGE: ARCHIVED ===== */}
        {stage === "archived" && (
          <div className="mb-4 rounded-lg border border-[var(--color-text-muted)]/20 bg-[var(--color-text-muted)]/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <span>{t("newsletters.archived")}</span>
            </div>
            {item.destination && <p className="mt-1 text-xs text-[var(--color-bg-surface)]/60">{item.destination}</p>}
          </div>
        )}
      </div>

      {/* Fixed bottom CTA bar */}
      <div className="shrink-0 border-t border-[var(--color-border)]/10 bg-white/[0.03] px-4 py-3">
        <DetailPanelCta
          stage={stage}
          item={item}
          articles={articles}
          generating={generating}
          allChecksPass={allChecksPass}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onPreview={onPreview}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onNavigateToDiscover={onNavigateToDiscover}
          onContinueToCompose={() => setStayInDiscover(false)}
        />
      </div>

      {/* Bottom fade */}
      {scrollFade && (
        <div className="pointer-events-none absolute bottom-[62px] left-0 right-0 z-10 h-10 rounded-b-lg bg-gradient-to-t from-white/[0.04] to-transparent" />
      )}
    </div>
  );
}
