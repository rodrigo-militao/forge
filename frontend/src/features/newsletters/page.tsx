import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { ChevronLeft, ChevronDown, ChevronRight, Plus, Eye, ArrowRight, Check } from "lucide-react";
import type { DragEndEvent } from "@dnd-kit/core";
import { api, type ArticleRef, type NewsletterEdition } from "../../api/client";
import { ContentEditor } from "../../components/editor/ContentEditor";
import { useAutosave } from "../../hooks/useAutosave";
import { NewsletterCard } from "./components/newsletter-card";
import { NewsletterDetailPanel } from "./components/detail-panel";
import { KanbanBoard, KanbanColumn } from "./components/kanban-board";

const STATUS_ORDER = ["building", "ready"] as const;

type StepState = "done" | "active" | "pending";

function editorPipelineSteps(item: NewsletterEdition): { label: string; state: StepState }[] {
  const hasArticles = item.article_count > 0;
  const hasBody = item.body_html.length > 0;
  const isReady = item.status === "ready";
  const isPublished = item.status === "published";

  return [
    { label: "Discover", state: "done" as StepState },
    { label: "Select", state: hasArticles ? "done" : "active" as StepState },
    { label: "Compose", state: hasBody ? "done" : (hasArticles ? "active" : "pending") as StepState },
    { label: "Review", state: isReady || isPublished ? "done" : (hasBody ? "active" : "pending") as StepState },
    { label: "Ready", state: isReady || isPublished ? "done" : "pending" as StepState },
  ];
}

export function NewslettersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<NewsletterEdition | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [bodyVersion, setBodyVersion] = useState(0);
  const [articles, setArticles] = useState<ArticleRef[]>([]);
  const [removingArticle, setRemovingArticle] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<NewsletterEdition | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const articlesReqRef = useRef(0);

  const { data: editions, isLoading } = useQuery({
    queryKey: ["editions"],
    queryFn: () => api.newsletters.list(),
  });

  const { data: availableTags } = useQuery({
    queryKey: ["tags"],
    queryFn: api.content.listTags,
  });

  // Set edit fields when selecting a newsletter
  useEffect(() => {
    if (selectedItem && !showEditor) {
      setEditTitle(selectedItem.title);
      setEditBody(selectedItem.body_html);
    }
  }, [selectedItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    if (!selectedItem) return;
    await api.newsletters.updateBody(selectedItem.id, {
      title: editTitle,
      body_html: editBody,
    });
    queryClient.invalidateQueries({ queryKey: ["editions"] });
  }, [selectedItem, editTitle, editBody, queryClient]);

  const { isSynced, isSaving, error: saveError } = useAutosave({
    save: handleSave,
    deps: [editBody, editTitle, selectedItem?.id],
    enabled: !!selectedItem && (editBody.length > 0 || editTitle.length > 0),
  });

  const handleCreate = useCallback(async () => {
    try {
      const edition = await api.newsletters.create({ title: t("newsletters.newRelease") });
      setSelectedItem(edition);
      setShowEditor(true);
      setShowPreview(false);
      setPreviewItem(null);
      setEditTitle(edition.title);
      setEditBody(edition.body_html);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [queryClient]);

  const handleSelect = useCallback(async (item: NewsletterEdition) => {
    setSelectedItem(item);
    setShowEditor(false);
    setShowPreview(false);
    setPreviewItem(null);
    setEditTitle(item.title);
    setEditBody(item.body_html);
    const reqId = ++articlesReqRef.current;
    setArticles([]);
    try {
      const arts = await api.newsletters.articles(item.id);
      if (reqId !== articlesReqRef.current) return;
      setArticles(arts);
    } catch {
      // silently ignore
    }
  }, []);

  const handleEditFromDetail = useCallback((item?: NewsletterEdition) => {
    const target = item ?? selectedItem;
    if (!target) return;
    setSelectedItem(target);
    setShowEditor(true);
    setShowPreview(false);
    setPreviewItem(null);
    setEditTitle(target.title);
    setEditBody(target.body_html);
  }, [selectedItem]);

  const handlePreviewFromDetail = useCallback((item?: NewsletterEdition) => {
    const target = item ?? selectedItem;
    if (!target) return;
    setPreviewItem(target);
    setShowPreview(true);
    setShowEditor(false);
  }, [selectedItem]);

  const handleNextStep = useCallback(async (item: NewsletterEdition) => {
    if (item.status === "building") {
      // Needs more work → open editor
      if (item.article_count === 0 || !item.body_html || item.body_html.length === 0) {
        handleEditFromDetail(item);
      } else {
        // Has articles + body → send for review
        try {
          await api.newsletters.updateStatus(item.id, "ready");
          queryClient.invalidateQueries({ queryKey: ["editions"] });
          toast.success(t("newsletters.movedToReview"));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
        }
      }
    } else if (item.status === "ready") {
      // Preview and publish → open preview
      handlePreviewFromDetail(item);
    }
  }, [queryClient, handleEditFromDetail, handlePreviewFromDetail]);

  const handleDuplicate = useCallback(async (item: NewsletterEdition) => {
    try {
      const dup = await api.newsletters.duplicate(item.id);
      toast.success(t("newsletters.releaseDuplicated"));
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      setSelectedItem(dup);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failedToDuplicate"));
    }
  }, [queryClient]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const editionId = active.data.current?.editionId as string;
    const currentStatus = active.data.current?.status as string;
    const targetStatus = (over.id as string).replace("column-", "");

    if (!editionId || !targetStatus || targetStatus === currentStatus) return;

    try {
      await api.newsletters.updateStatus(editionId, targetStatus);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failedToMove"));
    }
  }, [queryClient]);

  const handleBackFromEditor = useCallback(() => {
    setShowEditor(false);
  }, []);

  const handleBackFromPreview = useCallback(() => {
    setShowPreview(false);
    setPreviewItem(null);
  }, []);

  const handleCloseDetailPanel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateStatus(selectedItem.id, status);
      setSelectedItem((prev) => prev ? { ...prev, status: status as NewsletterEdition["status"] } : null);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      toast.success(t("editor.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient, t]);

  const handleCategoryChange = useCallback(async (category: string | null) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateCategory(selectedItem.id, category);
      setSelectedItem((prev) => prev ? { ...prev, category } : null);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient]);

  const handleDestinationChange = useCallback(async (destination: string | null) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateDestination(selectedItem.id, destination);
      setSelectedItem((prev) => prev ? { ...prev, destination } : null);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["editions", "destinations"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient]);

  const handleAddTag = useCallback(async (tag: string) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.addTag(selectedItem.id, tag);
      setSelectedItem((prev) => {
        if (!prev) return null;
        const tags = [...prev.tags, tag];
        return { ...prev, tags };
      });
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.removeTag(selectedItem.id, tag);
      setSelectedItem((prev) => {
        if (!prev) return null;
        return { ...prev, tags: prev.tags.filter((t) => t !== tag) };
      });
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient]);

  const handleTransform = useCallback(
    async (action: "expand" | "rewrite", editor: import("@tiptap/react").Editor) => {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      if (!selectedText.trim()) { toast.error("Select some text first"); return; }
      try {
        await api.compose.transform(selectedText, action);
        toast.success("Transform queued");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Transform failed");
      }
    }, []);

  const handleAddArticle = useCallback(async (contentID: string) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.addArticle(selectedItem.id, contentID);
      const [freshEdition, arts] = await Promise.all([
        api.newsletters.get(selectedItem.id),
        api.newsletters.articles(selectedItem.id),
      ]);
      setSelectedItem(freshEdition);
      setArticles(arts);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["article-newsletter-ids"] });
      toast.success(t("newsletters.articleAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failedToAdd"));
    }
  }, [selectedItem, queryClient]);

  const handleRemoveArticle = useCallback(async (contentID: string) => {
    if (!selectedItem) return;
    setRemovingArticle(contentID);
    try {
      await api.newsletters.removeArticle(selectedItem.id, contentID);
      setArticles((prev) => prev.filter((a) => a.content_id !== contentID));
      const freshEdition = await api.newsletters.get(selectedItem.id);
      setSelectedItem(freshEdition);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["article-newsletter-ids"] });
      toast.success(t("newsletters.articleRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
    setRemovingArticle(null);
  }, [selectedItem, queryClient]);

  const handleGenerateIntro = useCallback(async () => {
    if (!selectedItem || generating) return;
    setGenerating(true);
    try {
      await api.newsletters.generateIntro(selectedItem.id);
      toast.success(t("newsletters.introQueued"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
      setGenerating(false);
    }
  }, [selectedItem, generating, t]);

  // Wait for intro generation via SSE
  useEffect(() => {
    if (!generating) return;
    const timeout = setTimeout(() => setGenerating(false), 90000);
    return () => clearTimeout(timeout);
  }, [generating]);

  useEffect(() => {
    if (!generating || !selectedItem || !editions) return;
    const updated = editions.find((e) => e.id === selectedItem.id);
    if (updated && updated.body_html !== selectedItem.body_html) {
      setGenerating(false);
      setEditBody(updated.body_html);
      setSelectedItem(updated);
      setBodyVersion((v) => v + 1);
      toast.success(t("newsletters.introReady"));
    }
  }, [editions, selectedItem, generating, t]);

  // Escape key closes panels
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showPreview) { setShowPreview(false); setPreviewItem(null); return; }
        if (showEditor) { setShowEditor(false); return; }
        if (selectedItem) { setSelectedItem(null); }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showPreview, showEditor, selectedItem]);

  // --- Data ---
  const items = editions ?? [];
  const activeItems = items.filter((i) => i.status === "building" || i.status === "ready");
  const publishedItems = items.filter((i) => i.status === "published");
  const archivedItems = items.filter((i) => i.status === "archived");
  const archiveItems = [...publishedItems, ...archivedItems];
  const groups = STATUS_ORDER.map((status) => ({
    status,
    items: activeItems.filter((i) => i.status === status),
  }));
  const needsReviewCount = activeItems.filter(
    (i) => i.status === "building" && i.article_count > 0 && i.body_html.length > 0
  ).length;

  // --- Loading state: skeleton columns ---
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="skeleton skeleton-title !mb-0 !h-8 w-48" />
          <div className="skeleton !mb-0 !h-9 w-32 rounded-lg" />
        </div>
        <div className="flex gap-4">
          {STATUS_ORDER.map((_, i) => (
            <div key={i} className="w-[320px] shrink-0 rounded-xl border border-[var(--color-border)]/10 bg-white/[0.015] p-3">
              <div className="skeleton !mb-0 !h-6 w-24 rounded-md" />
              <div className="mt-3 space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="skeleton !mb-0 !h-28 rounded-lg"
                    style={{ animationDelay: `${(i * 2 + j) * 80}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Preview mode ---
  if (showPreview && previewItem) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-[fadeIn_400ms_ease-out_forwards]">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackFromPreview}
            className="group cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
          >
            <ChevronLeft size={16} />
            {t("newsletters.backToList")}
          </button>
          {previewItem.status === "ready" && (
            <button
              onClick={async () => {
                try {
                  await api.newsletters.updateStatus(previewItem.id, "published");
                  queryClient.invalidateQueries({ queryKey: ["editions"] });
                  toast.success(t("newsletters.markAsPublished"));
                  handleBackFromPreview();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
                }
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--color-accent-primary)]/90 hover:scale-[1.03] active:scale-[0.97]"
            >
              <Eye size={16} />
              {t("newsletters.markAsPublished")}
            </button>
          )}
        </div>
        <div className="rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02] p-6">
          <h1 className="mb-2 font-[var(--font-display)] text-2xl font-semibold text-[var(--color-bg-surface)]">
            {previewItem.title || t("newsletters.noTitle")}
          </h1>
          {previewItem.destination && (
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">
              Destination: {previewItem.destination}
            </p>
          )}
          <div
            className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--color-bg-surface)]/90 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_a]:text-[var(--color-accent-primary)] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: previewItem.body_html }}
          />
        </div>
      </div>
    );
  }

  // --- Editor view ---
  if (showEditor && selectedItem) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-[fadeIn_400ms_ease-out_forwards]">
        <button
          onClick={handleBackFromEditor}
          className="group cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
        >
          <ChevronLeft size={16} />
          {t("newsletters.backToList")}
        </button>

        {/* Compact pipeline status bar */}
        {(() => {
          const steps = editorPipelineSteps(selectedItem);
          const needsReview = selectedItem.status === "building" && selectedItem.article_count > 0 && selectedItem.body_html.length > 0;
          const isReadyPublish = selectedItem.status === "ready";
          const showCta = needsReview || isReadyPublish;
          return (
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02] px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                {steps.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-all duration-[var(--duration-base)] ${
                          step.state === "done"
                            ? "bg-[var(--color-accent-success)] text-white"
                            : step.state === "active"
                              ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] ring-1 ring-[var(--color-accent-primary)]/30"
                              : "bg-white/[0.04] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {step.state === "done" ? (
                          <Check size={9} strokeWidth={3} />
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-medium ${
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
                        className={`h-px w-3 ${
                          steps[i + 1].state === "done" || (step.state === "done" && steps[i + 1].state === "active")
                            ? "bg-[var(--color-accent-success)]/40"
                            : "bg-white/[0.08]"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {showCta && (
                <button
                  onClick={() => handleNextStep(selectedItem)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-[var(--duration-fast)] hover:scale-[1.02] active:scale-[0.97] ${
                    needsReview
                      ? "border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/25"
                      : "bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary)]/90"
                  }`}
                >
                  {needsReview ? t("newsletters.sendForReview") : t("newsletters.previewAndPublish")}
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          );
        })()}

        <ContentEditor
          title={editTitle}
          onTitleChange={setEditTitle}
          body={editBody}
          onBodyChange={setEditBody}
          tags={selectedItem.tags ?? []}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          availableTags={availableTags ?? []}
          status={selectedItem.status}
          onStatusChange={handleStatusChange}
          editorKey={`${selectedItem.id}-v${bodyVersion}`}
          isSynced={isSynced}
          isSaving={isSaving}
          saveError={saveError}
          titlePlaceholder={t("newsletters.titlePlaceholder")}
          onTransform={handleTransform}
        >
          <div className="flex gap-2">
            <button
              onClick={handleGenerateIntro}
              disabled={generating}
              className="group cursor-pointer rounded-lg border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/10 px-4 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-accent-primary)]/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
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
              ) : t("newsletters.generateIntro")}
            </button>
          </div>

          {articles.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-[var(--color-bg-surface)]">{t("newsletters.articles")}</label>
              <div className="space-y-2">
                {articles.map((a, idx) => (
                  <div
                    key={a.content_id}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 opacity-0 animate-[fadeIn_300ms_ease-out_forwards] transition-all duration-[var(--duration-base)] hover:bg-white/[0.08]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--color-bg-surface)]">{a.title || t("newsletters.noTitle")}</p>
                      {a.body_markdown && <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{a.body_markdown}</p>}
                    </div>
                    <button
                      onClick={() => handleRemoveArticle(a.content_id)}
                      disabled={removingArticle === a.content_id}
                      className="ml-2 cursor-pointer shrink-0 rounded p-1 text-[var(--color-text-muted)] opacity-0 transition-all duration-[var(--duration-fast)] group-hover:opacity-100 hover:bg-[var(--color-accent-danger)]/20 hover:text-[var(--color-accent-danger)] disabled:opacity-50"
                      style={removingArticle === a.content_id ? { opacity: 1 } : undefined}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <input
              type="text"
              defaultValue={selectedItem.category ?? ""}
              placeholder={t("newsletters.categoryPlaceholder")}
              onBlur={(e) => handleCategoryChange(e.target.value || null)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCategoryChange((e.target as HTMLInputElement).value || null); }}
              className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none transition-all duration-[var(--duration-fast)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)]/30"
            />
          </div>
        </ContentEditor>
      </div>
    );
  }

  // --- Main view: kanban + archive ---
  return (
    <div className="flex h-full flex-col p-6 animate-[fadeIn_400ms_ease-out_forwards]">
      {/* Top toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-semibold text-[var(--color-bg-surface)]">
            {t("newsletters.releases")}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {t("newsletters.activeReleases", { count: activeItems.length })}
            {publishedItems.length > 0 && ` · ${publishedItems.length} ${t("newsletters.published")}`}
            {archivedItems.length > 0 && ` · ${archivedItems.length} ${t("newsletters.archived")}`}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-accent-primary)]/90 hover:scale-[1.03] active:scale-[0.97]"
        >
          <Plus size={16} />
          {t("newsletters.newRelease")}
        </button>
      </div>

      {/* Active kanban columns */}
      <div className="flex flex-1 gap-0 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <KanbanBoard onDragEnd={handleDragEnd}>
            {groups.map((group) => (
              <KanbanColumn
                key={group.status}
                status={group.status}
                count={group.items.length}
                subtitle={group.status === "building" && needsReviewCount > 0 ? t("newsletters.needReview", { count: needsReviewCount }) : undefined}
              >
                {group.items.map((item) => (
                  <NewsletterCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={handleSelect}
                    onNextStep={handleNextStep}
                  />
                ))}
              </KanbanColumn>
            ))}
          </KanbanBoard>

          {/* Empty state when nothing exists at all */}
          {items.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04]">
                <Plus size={28} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("newsletters.noReleases")}
              </p>
            </div>
          )}

          {/* Archive section */}
          {archiveItems.length > 0 && (
            <div className="shrink-0 border-t border-[var(--color-border)]/10 pt-6 mt-3">
              <button
                onClick={() => setArchiveOpen(!archiveOpen)}
                className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-bg-surface)]"
              >
                {archiveOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {t("newsletters.historyTitle", { published: publishedItems.length, archived: archivedItems.length })}
              </button>

              {archiveOpen && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {archiveItems.map((item) => (
                    <div
                      key={item.id}
                      className="cursor-pointer rounded-lg border border-[var(--color-border)]/10 bg-white/[0.015] p-3.5 transition-all hover:border-[var(--color-border)]/30 hover:bg-white/[0.03]"
                    >
                      <div
                        onClick={() => {
                          setPreviewItem(item);
                          setShowPreview(true);
                        }}
                        className="min-w-0"
                      >
                        <h4 className="truncate text-sm font-medium text-[var(--color-bg-surface)]">
                          {item.title || t("newsletters.noTitle")}
                        </h4>
                        {item.destination && (
                          <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{item.destination}</p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
                          <span>{t("newsletters.articles", { count: item.article_count })}</span>
                          <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                          {item.status === "archived" && (
                            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">{t("newsletters.archived")}</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {item.tags.length > 0 && (
                          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                            {item.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                                {tag}
                              </span>
                            ))}
                            {item.tags.length > 3 && (
                              <span className="text-[10px] text-[var(--color-text-muted)]">
                                +{item.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {item.status === "archived" && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await api.newsletters.updateStatus(item.id, "building");
                                queryClient.invalidateQueries({ queryKey: ["editions"] });
                                toast.success(t("newsletters.reactivated"));
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : t("newsletters.failedToReactivate"));
                              }
                            }}
                            className="shrink-0 cursor-pointer rounded-lg border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/15 px-2.5 py-1 text-[10px] font-medium text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/25 active:scale-[0.97]"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            onEdit={() => handleEditFromDetail()}
            onPreview={() => handlePreviewFromDetail()}
            onDuplicate={handleDuplicate}
            onStatusChange={handleStatusChange}
            onCategoryChange={handleCategoryChange}
            onRemoveArticle={handleRemoveArticle}
            onAddArticle={handleAddArticle}
            onGenerateIntro={handleGenerateIntro}
            onDestinationChange={handleDestinationChange}
            onNavigateToDiscover={() => navigate({ to: "/discover" })}
          />
        )}
      </div>
    </div>
  );
}
