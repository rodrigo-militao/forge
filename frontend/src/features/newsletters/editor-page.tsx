import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { ChevronLeft, ArrowRight, Check } from "lucide-react";
import { api, type ArticleRef, type NewsletterEdition } from "../../api/client";
import { ContentEditor } from "../../components/editor/ContentEditor";
import { useAutosave } from "../../hooks/useAutosave";

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

export function NewsletterEditorPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ from: "/auth-layout/content/newsletters/$id/edit" });
  const editionId = params.id as string;

  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [bodyVersion, setBodyVersion] = useState(0);
  const [articles, setArticles] = useState<ArticleRef[]>([]);
  const [removingArticle, setRemovingArticle] = useState<string | null>(null);
  const [previewNewsletter, setPreviewNewsletter] = useState<NewsletterEdition | null>(null);

  const { data: edition, isLoading } = useQuery({
    queryKey: ["edition", editionId],
    queryFn: () => api.newsletters.get(editionId),
  });

  const { data: editionArticles } = useQuery({
    queryKey: ["edition-articles", editionId],
    queryFn: () => api.newsletters.articles(editionId),
  });

  const { data: availableTags } = useQuery({
    queryKey: ["tags"],
    queryFn: api.content.listTags,
  });

  // Set edit fields when edition loads
  useEffect(() => {
    if (edition) {
      setEditTitle(edition.title);
      setEditBody(edition.body_html);
    }
  }, [edition?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync articles
  useEffect(() => {
    if (editionArticles) {
      setArticles(editionArticles);
    }
  }, [editionArticles]);

  const handleSave = useCallback(async () => {
    if (!edition) return;
    await api.newsletters.updateBody(edition.id, {
      title: editTitle,
      body_html: editBody,
    });
    queryClient.invalidateQueries({ queryKey: ["editions"] });
    queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
  }, [edition, editTitle, editBody, queryClient, editionId]);

  const { isSynced, isSaving, error: saveError } = useAutosave({
    save: handleSave,
    deps: [editBody, editTitle, edition?.id],
    enabled: !!edition && (editBody.length > 0 || editTitle.length > 0),
  });

  const handleStatusChange = useCallback(async (status: string) => {
    if (!edition) return;
    try {
      await api.newsletters.updateStatus(edition.id, status);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
      toast.success(t("editor.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [edition, editionId, queryClient, t]);

  const handleCategoryChange = useCallback(async (category: string | null) => {
    if (!edition) return;
    try {
      await api.newsletters.updateCategory(edition.id, category);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [edition, editionId, queryClient, t]);

  const handleAddTag = useCallback(async (tag: string) => {
    if (!edition) return;
    try {
      await api.newsletters.addTag(edition.id, tag);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [edition, editionId, queryClient, t]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!edition) return;
    try {
      await api.newsletters.removeTag(edition.id, tag);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [edition, editionId, queryClient, t]);

  const handleRemoveArticle = useCallback(async (contentID: string) => {
    if (!edition) return;
    setRemovingArticle(contentID);
    try {
      await api.newsletters.removeArticle(edition.id, contentID);
      setArticles((prev) => prev.filter((a) => a.content_id !== contentID));
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
      queryClient.invalidateQueries({ queryKey: ["edition-articles", editionId] });
      queryClient.invalidateQueries({ queryKey: ["article-newsletter-ids"] });
      toast.success(t("newsletters.articleRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
    setRemovingArticle(null);
  }, [edition, editionId, queryClient, t]);

  const handleGenerateIntro = useCallback(async () => {
    if (!edition || generating) return;
    setGenerating(true);
    try {
      await api.newsletters.generateIntro(edition.id);
      toast.success(t("newsletters.introQueued"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
      setGenerating(false);
    }
  }, [edition, generating, t]);

  // Wait for intro generation via SSE
  useEffect(() => {
    if (!generating) return;
    const timeout = setTimeout(() => setGenerating(false), 90000);
    return () => clearTimeout(timeout);
  }, [generating]);

  useEffect(() => {
    if (!generating || !edition) return;
    const checkUpdate = async () => {
      try {
        const updated = await api.newsletters.get(edition.id);
        if (updated.body_html !== edition.body_html) {
          setGenerating(false);
          setEditBody(updated.body_html);
          setBodyVersion((v) => v + 1);
          toast.success(t("newsletters.introReady"));
        }
      } catch {
        // ignore
      }
    };
    const interval = setInterval(checkUpdate, 2000);
    return () => clearInterval(interval);
  }, [generating, edition, t]);

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

  const handleNextStep = useCallback(async () => {
    if (!edition) return;
    if (edition.status === "building") {
      if (edition.article_count === 0 || !edition.body_html || edition.body_html.length === 0) {
        // Stay in editor
        return;
      }
      try {
        await api.newsletters.updateStatus(edition.id, "ready");
        queryClient.invalidateQueries({ queryKey: ["editions"] });
        queryClient.invalidateQueries({ queryKey: ["edition", editionId] });
        toast.success(t("newsletters.movedToReview"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
      }
    } else if (edition.status === "ready") {
      setPreviewNewsletter(edition);
    }
  }, [edition, editionId, queryClient, t]);

  // Escape key closes editor
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        navigate({ to: "/content/newsletters" });
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [navigate]);

  if (isLoading || !edition) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div className="skeleton skeleton-title !mb-0 !h-8 w-48" />
        <div className="skeleton skeleton-card !mb-0 h-64 rounded-lg" />
      </div>
    );
  }

  // Preview overlay
  if (previewNewsletter) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <button
          onClick={() => setPreviewNewsletter(null)}
          className="group cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
        >
          <ChevronLeft size={16} />
          {t("nav.back")}
        </button>
        <div className="rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02] p-6">
          <h1 className="mb-2 font-[var(--font-display)] text-2xl font-semibold text-[var(--color-bg-surface)]">
            {previewNewsletter.title || t("newsletters.noTitle")}
          </h1>
          {previewNewsletter.destination && (
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">
              Destination: {previewNewsletter.destination}
            </p>
          )}
          <div
            className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--color-bg-surface)]/90 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_a]:text-[var(--color-accent-primary)] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: previewNewsletter.body_html }}
          />
        </div>
      </div>
    );
  }

  const steps = editorPipelineSteps(edition);
  const needsReview = edition.status === "building" && edition.article_count > 0 && edition.body_html.length > 0;
  const isReadyPublish = edition.status === "ready";
  const showCta = needsReview || isReadyPublish;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 animate-[fadeIn_400ms_ease-out_forwards]">
      <button
        onClick={() => navigate({ to: "/content/newsletters" })}
        className="group cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
      >
        <ChevronLeft size={16} />
        {t("newsletters.backToList")}
      </button>

      {/* Pipeline status bar */}
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
            onClick={handleNextStep}
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

      <ContentEditor
        title={editTitle}
        onTitleChange={setEditTitle}
        body={editBody}
        onBodyChange={setEditBody}
        tags={edition.tags ?? []}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        availableTags={availableTags ?? []}
        status={edition.status}
        onStatusChange={handleStatusChange}
        editorKey={`${edition.id}-v${bodyVersion}`}
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
            defaultValue={edition.category ?? ""}
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
