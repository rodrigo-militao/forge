import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { Eye, ChevronLeft, Copy } from "lucide-react";
import { api, type ArticleRef, type NewsletterEdition } from "../../api/client";
import { ContentEditor } from "../../components/editor/ContentEditor";
import { useAutosave } from "../../hooks/useAutosave";
import { NewsletterCard } from "./components/newsletter-card";
import { NewsletterDetailPanel } from "./components/detail-panel";

const STATUS_OPTIONS = ["building", "ready", "published", "archived"] as const;

export function NewslettersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<NewsletterEdition | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [bodyVersion, setBodyVersion] = useState(0);
  const [articles, setArticles] = useState<ArticleRef[]>([]);
  const [removingArticle, setRemovingArticle] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<NewsletterEdition | null>(null);
  const articlesReqRef = useRef(0);

  const { data: editions, isLoading } = useQuery({
    queryKey: ["editions", { status: statusFilter || undefined, category: categoryFilter || undefined }],
    queryFn: () => api.newsletters.list({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    }),
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
      const edition = await api.newsletters.create({ title: "New newsletter" });
      setSelectedItem(edition);
      setShowEditor(true);
      setShowPreview(false);
      setPreviewItem(null);
      setEditTitle(edition.title);
      setEditBody(edition.body_html);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
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
      if (reqId !== articlesReqRef.current) return; // stale response
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

  const handleDuplicate = useCallback(async (item: NewsletterEdition) => {
    try {
      const dup = await api.newsletters.duplicate(item.id);
      toast.success("Release duplicated");
      queryClient.invalidateQueries({ queryKey: ["editions"] });
      setSelectedItem(dup);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate");
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
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [selectedItem, queryClient, t]);

  const handleCategoryChange = useCallback(async (category: string | null) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateCategory(selectedItem.id, category);
      setSelectedItem((prev) => prev ? { ...prev, category } : null);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
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
      toast.error(err instanceof Error ? err.message : "Failed");
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
      toast.error(err instanceof Error ? err.message : "Failed");
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
      toast.error(err instanceof Error ? err.message : "Failed");
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

  const handleRemoveArticle = useCallback(async (contentID: string) => {
    if (!selectedItem) return;
    setRemovingArticle(contentID);
    try {
      await api.newsletters.removeArticle(selectedItem.id, contentID);
      setArticles((prev) => prev.filter((a) => a.content_id !== contentID));
      toast.success("Article removed from newsletter");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
    setRemovingArticle(null);
  }, [selectedItem]);

  const handleGenerateIntro = useCallback(async () => {
    if (!selectedItem || generating) return;
    setGenerating(true);
    try {
      await api.newsletters.generateIntro(selectedItem.id);
      toast.success(t("newsletters.introQueued"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
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

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="skeleton skeleton-title !mb-0" />
          <div className="skeleton !mb-0 !h-9 w-36 rounded-lg" />
        </div>
        <div className="mb-4 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton !mb-0 !h-7 w-20 rounded-full" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card !mb-3 !h-24 rounded-lg"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }

  // Preview mode — read-only rendered body
  if (showPreview && previewItem) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-[fadeIn_400ms_ease-out_forwards]">
        <button
          onClick={handleBackFromPreview}
          className="group cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
        >
          <ChevronLeft size={16} />
          Back to newsletters
        </button>
        <div className="rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02] p-6">
          <h1 className="mb-2 font-[var(--font-display)] text-2xl font-semibold text-[var(--color-bg-surface)]">
            {previewItem.title || "(no title)"}
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

  // Editor view
  if (showEditor && selectedItem) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-[fadeIn_400ms_ease-out_forwards]">
        <button
          onClick={handleBackFromEditor}
          className="group cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
        >
          <ChevronLeft size={16} />
          Back to newsletters
        </button>
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
          {/* Newsletter-specific extras */}
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
              <label className="text-sm font-medium text-[var(--color-bg-surface)]">Articles</label>
              <div className="space-y-2">
                {articles.map((a, idx) => (
                  <div
                    key={a.content_id}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 opacity-0 animate-[fadeIn_300ms_ease-out_forwards] transition-all duration-[var(--duration-base)] hover:bg-white/[0.08]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--color-bg-surface)]">{a.title || "(no title)"}</p>
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

  // --- Dashboard (split view: list + detail panel) ---
  const items = editions ?? [];
  const categories = [...new Set(items.map((e) => e.category).filter(Boolean))] as string[];

  return (
    <div className="p-6 animate-[fadeIn_400ms_ease-out_forwards]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-[var(--color-bg-surface)]">
          {t("newsletters.title")}
          {items.length > 0 && (
            <span className="ml-2 align-baseline font-[var(--font-body)] text-base font-normal text-[var(--color-text-muted)]">
              {items.length}
            </span>
          )}
        </h1>
        <button
          onClick={handleCreate}
          className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-accent-primary)]/90 hover:scale-[1.03] active:scale-[0.97]"
        >
          {t("newsletters.createNew")}
        </button>
      </div>

      {/* Filter toolbar */}
      {items.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Status</span>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all duration-[var(--duration-fast)] active:scale-95 ${
                statusFilter === s
                  ? s === "archived"
                    ? "bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]"
                    : s === "ready"
                      ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]"
                      : "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                  : "bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          {categories.length > 0 && (
            <>
              <span className="h-4 w-px bg-white/10" />
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Category</span>
              <button
                onClick={() => setCategoryFilter("")}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all duration-[var(--duration-fast)] active:scale-95 ${
                  !categoryFilter
                    ? "bg-white/10 text-[var(--color-bg-surface)]"
                    : "bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-white/10"
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(categoryFilter === c ? "" : c)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all duration-[var(--duration-fast)] active:scale-95 ${
                    categoryFilter === c
                      ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                      : "bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-white/10"
                  }`}
                >
                  {c}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Dashboard list + optional detail panel */}
      <div className="flex gap-0">
        <div className={selectedItem ? "flex-1 min-w-0" : "w-full max-w-2xl"}>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.id}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="opacity-0 animate-[fadeIn_300ms_ease-out_forwards]"
              >
                <NewsletterCard
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onClick={handleSelect}
                  onEdit={handleEditFromDetail}
                  onPreview={handlePreviewFromDetail}
                  onDuplicate={handleDuplicate}
                />
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04]">
                <Copy size={28} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                {statusFilter || categoryFilter
                  ? "No releases match the current filter."
                  : "No releases yet. Create your first newsletter release."}
              </p>
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
            onGenerateIntro={handleGenerateIntro}
            onDestinationChange={handleDestinationChange}
          />
        )}
      </div>
    </div>
  );
}
