import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { api, type ArticleRef } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { useAutosave } from "../../../hooks/useAutosave";
import { useAITransform } from "../../../hooks/useAITransform";

export type SidebarTab = "ai" | "articles";

const SUBTITLE_RE = /^<p data-subtitle="">([\s\S]*?)<\/p>/;

export function useEditorWorkspace(editionId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [bodyVersion, setBodyVersion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [articles, setArticles] = useState<ArticleRef[]>([]);
  const [removingArticle, setRemovingArticle] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("ai");

  const { handleTransform } = useAITransform();

  // Queries
  const { data: edition, isLoading } = useQuery({
    queryKey: queryKeys.editions.detail(editionId),
    queryFn: () => api.newsletters.get(editionId),
  });

  const { data: editionArticles } = useQuery({
    queryKey: queryKeys.editions.articles(editionId),
    queryFn: () => api.newsletters.articles(editionId),
  });

  const { data: allContent } = useQuery({
    queryKey: queryKeys.content.all,
    queryFn: api.content.list,
  });

  const { data: articleIDsInAnyNewsletter } = useQuery({
    queryKey: queryKeys.articleNewsletterIds.all,
    queryFn: api.digest.articleNewsletterIDs,
  });

  const { data: availableTags } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: api.content.listTags,
  });

  // Set edit fields when edition loads — bump bodyVersion to remount editor
  useEffect(() => {
    if (edition) {
      setEditTitle(edition.title);
      const match = edition.body_html.match(SUBTITLE_RE);
      if (match) {
        setEditSubtitle(match[1]);
        setEditBody(edition.body_html.slice(match[0].length));
      } else {
        setEditSubtitle("");
        setEditBody(edition.body_html);
      }
      setBodyVersion((v) => v + 1);
    }
  }, [edition?.id, edition?.body_html]);

  // Sync articles
  useEffect(() => {
    if (editionArticles) {
      setArticles(editionArticles);
    }
  }, [editionArticles]);

  // Save handler for autosave
  const handleSave = useCallback(async () => {
    if (!edition) return;
    const subtitleHtml = editSubtitle
      ? `<p data-subtitle="">${editSubtitle}</p>`
      : "";
    await api.newsletters.updateBody(edition.id, {
      title: editTitle,
      body_html: subtitleHtml + editBody,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
  }, [edition, editTitle, editSubtitle, editBody, queryClient, editionId]);

  const { isSynced, isSaving, error: saveError } = useAutosave({
    save: handleSave,
    deps: [editBody, editTitle, editSubtitle, edition?.id],
    enabled: !!edition,
  });

  // Actions
  const handleBack = useCallback(() => {
    navigate({ to: "/content/newsletters" });
  }, [navigate]);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!edition) return;
    try {
      await api.newsletters.updateStatus(edition.id, status);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      toast.success(t("editor.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [edition, editionId, queryClient, t]);

  const handleDuplicate = useCallback(async () => {
    if (!edition) return;
    try {
      const dup = await api.newsletters.duplicate(edition.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      toast.success(t("newsletters.newsletterDuplicated"));
      navigate({ to: `/content/newsletters/${dup.id}/edit` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [edition, editionId, queryClient, t, navigate]);

  const handleUnarchive = useCallback(async () => {
    if (!edition) return;
    try {
      await api.newsletters.updateStatus(edition.id, "building");
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      toast.success(t("editor.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [edition, editionId, queryClient, t]);

  const handleCategoryChange = useCallback(async (category: string | null) => {
    if (!edition) return;
    try {
      await api.newsletters.updateCategory(edition.id, category);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [edition, editionId, queryClient, t]);

  const handleAddTag = useCallback(async (tag: string) => {
    if (!edition) return;
    try {
      await api.newsletters.addTag(edition.id, tag);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [edition, editionId, queryClient, t]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!edition) return;
    try {
      await api.newsletters.removeTag(edition.id, tag);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.articles(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.articleNewsletterIds.all });
      toast.success(t("newsletters.articleRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
    setRemovingArticle(null);
  }, [edition, editionId, queryClient, t]);

  const handleAddArticle = useCallback(async (contentID: string) => {
    if (!edition) return;
    try {
      await api.newsletters.addArticle(edition.id, contentID);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.articles(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.articleNewsletterIds.all });
      toast.success(t("newsletters.articleAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
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

  // Wait for intro generation
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

  // Derive available articles (not in any newsletter)
  const articleIDsInEdition = new Set(articles.map((a) => a.content_id));
  const usedIDs = new Set([...articleIDsInEdition, ...(articleIDsInAnyNewsletter ?? [])]);
  const availableArticles = (allContent ?? []).filter(
    (c) => c.deleted_at === null && !usedIDs.has(c.id)
  );

  // Escape key closes sidebar, then navigates back
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (sidebarVisible) {
          setSidebarVisible(false);
          return;
        }
        navigate({ to: "/content/newsletters" });
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [navigate, sidebarVisible]);

  return {
    // State
    edition,
    isLoading,
    editTitle,
    editSubtitle,
    editBody,
    setEditTitle,
    setEditSubtitle,
    setEditBody,
    bodyVersion,
    generating,
    articles,
    removingArticle,
    showPreview,
    setShowPreview,
    sidebarVisible,
    setSidebarVisible,
    sidebarTab,
    setSidebarTab,
    availableArticles,
    availableTags: availableTags ?? [],
    isSynced,
    isSaving,
    saveError,

    // Refs
    editionId,

    // Actions
    handleBack,
    handleStatusChange,
    handleDuplicate,
    handleUnarchive,
    handleCategoryChange,
    handleAddTag,
    handleRemoveTag,
    handleRemoveArticle,
    handleAddArticle,
    handleGenerateIntro,
    handleTransform,
  };
}
