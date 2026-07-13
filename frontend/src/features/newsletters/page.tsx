import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { api, type ArticleRef, type NewsletterEdition } from "../../api/client";
import { ContentEditor } from "../../components/editor/ContentEditor";
import { useAutosave } from "../../hooks/useAutosave";

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
    if (selectedItem) {
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
      setEditTitle(edition.title);
      setEditBody(edition.body_html);
      queryClient.invalidateQueries({ queryKey: ["editions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [queryClient]);

  const handleSelect = useCallback(async (item: NewsletterEdition) => {
    setSelectedItem(item);
    setEditTitle(item.title);
    setEditBody(item.body_html);
    setArticles([]);
    try {
      const arts = await api.newsletters.articles(item.id);
      setArticles(arts);
    } catch {
      // silently ignore
    }
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

  // Wait for intro generation via SSE (timeout safety net)
  useEffect(() => {
    if (!generating) return;
    const timeout = setTimeout(() => setGenerating(false), 90000);
    return () => clearTimeout(timeout);
  }, [generating]);

  // Detect when intro is ready — watches editions query data directly
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

  // Loading state — skeleton with staggered shimmer
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="skeleton skeleton-title !mb-0" />
          <div className="skeleton !mb-0 !h-9 w-36 rounded-lg" />
        </div>
        <div className="mb-4 flex gap-2">
          <div className="skeleton !mb-0 !h-7 w-16 rounded-full" />
          <div className="skeleton !mb-0 !h-7 w-20 rounded-full" />
          <div className="skeleton !mb-0 !h-7 w-18 rounded-full" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card !mb-3 !h-20 rounded-lg"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }

  // Editor view — uses shared ContentEditor
  if (selectedItem) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-[fadeIn_400ms_ease-out_forwards]">
        <button
          onClick={() => setSelectedItem(null)}
          className="group cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] transition-colors hover:text-[var(--color-accent-primary)]/80"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="transition-transform duration-[var(--duration-fast)] group-hover:animate-[arrowSlide_400ms_ease-out]"
          >
            <path d="M19 12H5m7-7-7 7 7 7"/>
          </svg>
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
          {/* Newsletter-specific: AI Intro button */}
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

          {/* Newsletter-specific: linked articles */}
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

          {/* Newsletter-specific: category */}
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

  // --- List view ---
  const items = editions ?? [];
  const categories = [...new Set(items.map((e) => e.category).filter(Boolean))] as string[];

  return (
    <div className="mx-auto max-w-4xl p-6 animate-[fadeIn_400ms_ease-out_forwards]">
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
          {(["draft", "published", "discarded"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all duration-[var(--duration-fast)] active:scale-95 ${
                statusFilter === s
                  ? s === "discarded"
                    ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                    : "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                  : "bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
              }`}
            >
              {s === "published" ? "Published" : s.charAt(0).toUpperCase() + s.slice(1)}
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
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all duration-[var(--duration-fast)] active:scale-95 ${
                    categoryFilter === cat
                      ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                      : "bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center py-16 opacity-0 animate-[fadeIn_500ms_ease-out_forwards]">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent-primary)]/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 8l10 6 10-6" />
            </svg>
          </div>
          <h2 className="font-[var(--font-display)] text-xl text-[var(--color-bg-surface)]">
            {t("newsletters.title")}
          </h2>
          <p className="mt-2 max-w-sm text-center text-sm text-[var(--color-text-muted)]">
            {t("newsletters.emptyDesc")}
          </p>
          <button
            onClick={handleCreate}
            className="mt-6 cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-accent-primary)]/90 hover:scale-[1.03] active:scale-[0.97]"
          >
            {t("newsletters.createNew")}
          </button>
        </div>
      )}

      {/* Newsletter cards */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              style={{ animationDelay: `${idx * 50}ms` }}
              className="group w-full cursor-pointer rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02] p-4 text-left opacity-0 animate-[slideUp_400ms_ease-out_forwards] transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:border-[var(--color-accent-primary)]/20 hover:bg-white/[0.06] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:translate-y-0"
            >
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium text-[var(--color-bg-surface)]">{item.title || "(no title)"}</h3>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                  item.status === "published"
                    ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]"
                    : item.status === "discarded"
                      ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                      : "bg-white/10 text-[var(--color-text-muted)]"
                }`}>
                  {item.status === "published" ? "Published" : item.status === "discarded" ? "Discarded" : "Draft"}
                </span>
                {item.category && (
                  <span className="shrink-0 rounded-full bg-[var(--color-accent-primary)]/20 px-2 py-0.5 text-xs text-[var(--color-accent-primary)]">
                    {item.category}
                  </span>
                )}
              </div>
              {item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
