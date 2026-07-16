import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, X, Copy, Check, ExternalLink, Edit3, Eye, ArrowRight, ChevronDown, ClipboardList, FileText, Clock, AlignLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { NewsletterEdition, ArticleRef } from "../../../api/client";
import { api } from "../../../api/client";
import { formatTimeAgo } from "../../digest/components/stats-bar";

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

const statusConfig: Record<string, { labelKey: string; className: string }> = {
  building: { labelKey: "newsletters.building", className: "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]" },
  ready: { labelKey: "newsletters.ready", className: "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]" },
  published: { labelKey: "newsletters.published", className: "bg-white/10 text-[var(--color-bg-surface)]" },
  archived: { labelKey: "newsletters.archived", className: "bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]" },
};

const DEFAULT_DESTINATIONS = ["Substack", "Markdown genérico", "Texto simples"];

type StepState = "done" | "active" | "pending";
type Stage = "discover" | "compose" | "ready" | "published" | "archived";

function getStage(item: NewsletterEdition): Stage {
  if (item.status === "archived") return "archived";
  if (item.status === "published") return "published";
  if (item.status === "ready") return "ready";
  if (item.status === "building" && item.article_count > 0) return "compose";
  return "discover";
}

function getPipelineSteps(item: NewsletterEdition): { label: string; state: StepState }[] {
  const hasArticles = item.article_count > 0;
  const hasBody = item.body_html.length > 0;
  const isReady = item.status === "ready";
  const isPublished = item.status === "published";

  return [
    { label: "Discover", state: hasArticles ? "done" : "active" as StepState },
    { label: "Compose", state: hasBody ? "done" : (hasArticles ? "active" : "pending") as StepState },
    { label: "Review", state: isReady || isPublished ? "done" : (hasBody ? "active" : "pending") as StepState },
    { label: "Ready", state: isReady || isPublished ? "done" : "pending" as StepState },
  ];
}

function PipelineProgress({ item }: { item: NewsletterEdition }) {
  const steps = getPipelineSteps(item);

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-[var(--duration-base)] ${
                  step.state === "done"
                    ? "bg-[var(--color-accent-success)] text-white shadow-sm shadow-[var(--color-accent-success)]/30"
                    : step.state === "active"
                      ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]/50 shadow-lg shadow-[var(--color-accent-primary)]/15"
                      : "bg-white/[0.04] text-[var(--color-text-muted)]"
                }`}
              >
                {step.state === "done" ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  step.state === "done"
                    ? "text-[var(--color-accent-success)]"
                    : step.state === "active"
                      ? "text-[var(--color-accent-primary)]"
                      : "text-[var(--color-text-muted)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-1.5 mb-5 h-px w-5 ${
                  steps[i + 1].state === "done" || (step.state === "done" && steps[i + 1].state === "active")
                    ? "bg-[var(--color-accent-success)]/50"
                    : "bg-white/[0.08]"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StageSection({ label, children, defaultCollapsed }: { label: string; children: React.ReactNode; defaultCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const isCollapsible = defaultCollapsed !== undefined;
  return (
    <div className="mb-4">
      <div
        className={`mb-2.5 flex items-center gap-3 ${isCollapsible ? "cursor-pointer select-none" : ""}`}
        onClick={() => isCollapsible && setCollapsed(!collapsed)}
      >
        {isCollapsible && (
          <ChevronDown
            size={11}
            className={`shrink-0 text-[var(--color-text-muted)]/50 transition-transform duration-[var(--duration-fast)] ${collapsed ? "-rotate-90" : ""}`}
          />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]/80">{label}</span>
        <div className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-white/[0.08] to-transparent" />
      </div>
      {!collapsed && children}
    </div>
  );
}

function AvailableArticles({
  availableArticles,
  onAddArticle,
}: {
  availableArticles: { id: string; title: string | null }[];
  onAddArticle: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <StageSection label={`${t("newsletters.availableArticles")}${availableArticles.length > 0 ? ` (${availableArticles.length})` : ""}`}>
      {availableArticles.length > 0 ? (
        <div className="max-h-40 w-full space-y-1 overflow-y-auto">
          {availableArticles.map((c) => (
            <div
              key={c.id}
              className="flex w-full items-center justify-between rounded-md bg-white/[0.02] px-2.5 py-1.5 transition-colors hover:bg-white/[0.06]"
            >
              <span className="min-w-0 truncate text-xs text-[var(--color-bg-surface)]/70">
                {c.title || t("newsletters.noTitle")}
              </span>
              <button
                onClick={() => onAddArticle(c.id)}
                className="ml-1 shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/20"
              >
                {t("editor.add")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">{t("newsletters.noContentAvailable")}</p>
      )}
    </StageSection>
  );
}

function CopyButton({ getContent, label }: { getContent: () => string; label: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }, [getContent]);

  return (
    <button
      onClick={handleCopy}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)]/10 px-3 py-1.5 text-[11px] text-[var(--color-bg-surface)]/80 transition-all hover:bg-white/10 hover:text-[var(--color-bg-surface)] active:scale-[0.97]"
    >
      <Copy size={12} />
      {copied ? t("newsletters.copied") : label}
    </button>
  );
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
  const [editingDest, setEditingDest] = useState(false);
  const [destValue, setDestValue] = useState(item.destination ?? "");
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [scrollFade, setScrollFade] = useState(false);
  const [stayInDiscover, setStayInDiscover] = useState(false);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const prevStageRef = useRef(getStage(item));
  const destRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const naturalStage = getStage(item);
  // Stay in discover when user adds articles — only leave on explicit action
  const stage = stayInDiscover ? "discover" : naturalStage;
  const cfg = statusConfig[item.status] ?? statusConfig.building;

  // Track natural stage transitions: if leaving discover naturally, keep user there
  useEffect(() => {
    if (prevStageRef.current === "discover" && naturalStage !== "discover") {
      setStayInDiscover(true);
    }
    if (prevStageRef.current !== "discover" && naturalStage === "discover") {
      setStayInDiscover(false);
    }
    prevStageRef.current = naturalStage;
  }, [naturalStage]);

  // Reset stayInDiscover when selecting a different newsletter
  useEffect(() => {
    setStayInDiscover(false);
  }, [item.id]);

  // Available content items (truly "Novos": not in ANY newsletter, not in this edition)
  const { data: allContent } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
  });
  const { data: articleIDsInAnyNewsletter } = useQuery({
    queryKey: ["article-newsletter-ids"],
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

  // Destinations
  const { data: usedDestinations } = useQuery({
    queryKey: ["editions", "destinations"],
    queryFn: api.newsletters.listDestinations,
  });

  const allSuggestions = [
    ...DEFAULT_DESTINATIONS,
    ...(usedDestinations?.filter((d) => !DEFAULT_DESTINATIONS.includes(d)) ?? []),
  ];

  const filteredSuggestions = destValue
    ? allSuggestions.filter((d) => d.toLowerCase().includes(destValue.toLowerCase()))
    : allSuggestions;

  // Outside click for destination dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setShowDestSuggestions(false);
      }
    }
    if (showDestSuggestions) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showDestSuggestions]);

  const handleDestSelect = useCallback((d: string) => {
    setDestValue(d);
    setShowDestSuggestions(false);
    onDestinationChange(d);
  }, [onDestinationChange]);

  const handleDestBlur = useCallback(() => {
    onDestinationChange(destValue || null);
  }, [destValue, onDestinationChange]);

  // Review checklist items
  const checklist = [
    { label: t("newsletters.articlesSelected"), done: item.article_count > 0, detail: `${item.article_count} ${t("newsletters.articles")}` },
    { label: t("newsletters.bodyWritten"), done: item.body_html.length > 0 },
    { label: t("newsletters.destinationConfigured"), done: !!item.destination },
    { label: t("newsletters.categorySet"), done: !!item.category },
  ];
  const allChecksPass = checklist.every((c) => c.done);

  // Destination editor (shared across stages)
  const destinationEditor = (
    <div ref={destRef} className="relative">
      {editingDest ? (
        <>
          <input
            type="text"
            value={destValue}
            onChange={(e) => { setDestValue(e.target.value); setShowDestSuggestions(true); }}
            onFocus={() => setShowDestSuggestions(true)}
            onBlur={handleDestBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDestSelect(destValue);
              if (e.key === "Escape") { setShowDestSuggestions(false); (e.target as HTMLInputElement).blur(); }
            }}
            placeholder={t("newsletters.destinationPlaceholder")}
            className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none transition-all duration-[var(--duration-fast)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)]/30"
            autoFocus
          />
          {showDestSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-32 overflow-y-auto rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg-base)] p-1 shadow-lg">
              {filteredSuggestions.map((d) => (
                <button
                  key={d}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleDestSelect(d)}
                  className="flex w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-xs text-[var(--color-bg-surface)] transition-colors hover:bg-white/10"
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <button
          onClick={() => setEditingDest(true)}
          className="flex w-full cursor-pointer items-center rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent-primary)]/30 hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
        >
          {item.destination || t("newsletters.setDestination")}
        </button>
      )}
    </div>
  );

  // Tags display (shared)
  // Word count from body_html
  const wordCount = item.body_html
    ? item.body_html.replace(/<[^>]*>/g, "").trim().split(/\s+/).filter(Boolean).length
    : 0;

  const tagsSection = item.tags.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {item.tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-[var(--color-accent-primary)]/20 px-2 py-0.5 text-[11px] text-[var(--color-accent-primary)]"
        >
          {tag}
        </span>
      ))}
    </div>
  );

  // Stage-aware bottom CTA
  const bottomCta = (() => {
    switch (stage) {
      case "discover":
        if (articles.length > 0) {
          return (
            <button
              onClick={() => setStayInDiscover(false)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent-primary)]/20 transition-all hover:bg-[var(--color-accent-primary)]/90 hover:shadow-lg hover:shadow-[var(--color-accent-primary)]/25 active:scale-[0.97]"
            >
              {t("newsletters.continueToCompose")}
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          );
        }
        return (
          <button
            onClick={onNavigateToDiscover}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/20 active:scale-[0.97]"
          >
            <ExternalLink size={15} />
            {t("newsletters.discoverWeb")}
          </button>
        );
      case "compose":
        if (allChecksPass && !generating) {
          return (
            <button
              onClick={() => onStatusChange("ready")}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-success)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent-success)]/20 transition-all hover:bg-[var(--color-accent-success)]/90 hover:shadow-lg hover:shadow-[var(--color-accent-success)]/25 active:scale-[0.97]"
            >
              <ClipboardList size={16} />
              {t("newsletters.sendForReview")}
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          );
        }
        return (
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
            >
              <Edit3 size={15} />
              {t("newsletters.continueEditing")}
            </button>
            <button
              onClick={onPreview}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-border)]/20 px-4 py-2.5 text-sm text-[var(--color-bg-surface)] transition-all hover:bg-white/10 active:scale-[0.97]"
            >
              <Eye size={15} />
              {t("newsletters.preview")}
            </button>
          </div>
        );
      case "ready":
        return (
          <button
            onClick={() => onStatusChange("published")}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--color-accent-primary)]/20 transition-all hover:bg-[var(--color-accent-primary)]/90 hover:shadow-lg hover:shadow-[var(--color-accent-primary)]/25 active:scale-[0.97]"
          >
            <Eye size={16} />
            {t("newsletters.markAsPublished")}
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        );
      case "published":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => onDuplicate(item)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
            >
              <Copy size={15} />
              {t("newsletters.createNextEdition")}
            </button>
            <button
              onClick={() => onArchive(item)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-accent-danger)]/30 px-4 py-2.5 text-sm text-[var(--color-accent-danger)] transition-all hover:bg-[var(--color-accent-danger)]/10 active:scale-[0.97]"
            >
              <Archive size={15} />
            </button>
          </div>
        );
      case "archived":
        return (
          <button
            onClick={onUnarchive}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/20 active:scale-[0.97]"
          >
            {t("newsletters.unarchiveAction")}
          </button>
        );
    }
  })();

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
            <button
              onClick={onClose}
              className="cursor-pointer rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ===== STAGE: DISCOVER (browse Novos articles + add) ===== */}
        {stage === "discover" && (
          <>
            <p className="mb-3 text-sm text-[var(--color-bg-surface)]/80">
              {t("newsletters.discoverDesc")}
            </p>

            <AvailableArticles
              availableArticles={availableArticles}
              onAddArticle={onAddArticle}
            />

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

        {/* ===== STAGE: COMPOSE (writing + review checklist + export) ===== */}
        {stage === "compose" && (
          <>
            <StageSection label={t("newsletters.checklist")}>
              <div className="space-y-2">
                {checklist.map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        c.done
                          ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]"
                          : "bg-white/[0.04] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {c.done ? <Check size={10} strokeWidth={3} /> : <span className="text-[10px]">•</span>}
                    </div>
                    <span className={`text-xs ${c.done ? "text-[var(--color-bg-surface)]/80" : "text-[var(--color-text-muted)]"}`}>
                      {c.label}
                      {c.detail && ` — ${c.detail}`}
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
                          <span className="truncate text-xs text-[var(--color-bg-surface)] group-hover:text-[var(--color-accent-primary)]">
                            {a.title || t("newsletters.noTitle")}
                          </span>
                          {(() => {
                            const contentItem = allContent?.find((c) => c.id === a.content_id);
                            const sourceUrl = contentItem?.metadata?.source_url as string | undefined;
                            return sourceUrl ? (
                              <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-all hover:text-[var(--color-accent-primary)] group-hover:opacity-100"
                              >
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
                          <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--color-border)]/10 pt-2">
                            {(() => {
                              const contentItem = allContent?.find((c) => c.id === a.content_id);
                              const sourceUrl = contentItem?.metadata?.source_url as string | undefined;
                              return sourceUrl ? (
                                <a
                                  href={sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex cursor-pointer items-center gap-1 text-[10px] font-medium text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
                                >
                                  <ExternalLink size={11} />
                                  {t("newsletters.viewSource")}
                                </a>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">{t("newsletters.noArticlesYet")}</p>
              )}
            </StageSection>

            <AvailableArticles
              availableArticles={availableArticles}
              onAddArticle={onAddArticle}
            />

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
                {destinationEditor}
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
                    onClick={() => setEditingCategory(true)}
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
                <CopyButton
                  getContent={() => item.body_html}
                  label={t("newsletters.copyAsHtml")}
                />
                <CopyButton
                  getContent={() => item.body_html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()}
                  label={t("newsletters.copyAsText")}
                />
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

            {tagsSection && (
              <StageSection label={t("newsletters.topics")}>
                {tagsSection}
              </StageSection>
            )}

            <StageSection label={t("newsletters.export")}>
              <div className="flex flex-wrap gap-2">
                <CopyButton
                  getContent={() => item.body_html}
                  label={t("newsletters.copyAsHtml")}
                />
                <CopyButton
                  getContent={() => item.body_html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()}
                  label={t("newsletters.copyAsText")}
                />
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
              {item.destination && (
                <p className="mt-0.5 text-xs text-[var(--color-bg-surface)]/80">
                  {item.destination}
                </p>
              )}
              {item.article_count > 0 && (
                <p className="mt-0.5 text-xs text-[var(--color-bg-surface)]/60">
                  {t("newsletters.article", { count: item.article_count })}
                </p>
              )}
            </div>

            {tagsSection && (
              <StageSection label={t("newsletters.topics")}>
                {tagsSection}
              </StageSection>
            )}

          </>
        )}

        {/* ===== STAGE: ARCHIVED ===== */}
        {stage === "archived" && (
          <>
            <div className="mb-4 rounded-lg border border-[var(--color-text-muted)]/20 bg-[var(--color-text-muted)]/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Archive size={16} />
                {t("newsletters.archived")}
              </div>
              {item.destination && (
                <p className="mt-1 text-xs text-[var(--color-bg-surface)]/60">{item.destination}</p>
              )}
            </div>

          </>
        )}
      </div>

      {/* Fixed bottom CTA bar */}
      <div className="shrink-0 border-t border-[var(--color-border)]/10 bg-white/[0.03] px-4 py-3">
        {bottomCta}
      </div>

      {/* Bottom fade (over the scrollable area, above the fixed bar) */}
      {scrollFade && (
        <div className="pointer-events-none absolute bottom-[62px] left-0 right-0 z-10 h-10 rounded-b-lg bg-gradient-to-t from-white/[0.04] to-transparent" />
      )}
    </div>
  );
}
