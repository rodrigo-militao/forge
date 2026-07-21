import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { api } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { useAutosave } from "../../../hooks/useAutosave";
import { useAITransform } from "../../../hooks/useAITransform";
import { useEditorQueries } from "./use-editor-queries";

export type SidebarTab = "ai" | "articles";

const SUBTITLE_RE = /^\s*<p[^>]*?\bdata-subtitle\b[^>]*?>([\s\S]*?)<\/p>\s*/i;

/** Extract subtitle from body_html, returns [subtitle, remainingBody] */
export function extractSubtitle(bodyHtml: string): [string, string] {
  const match = bodyHtml.match(SUBTITLE_RE);
  if (match) {
    return [match[1], bodyHtml.slice(match[0].length)];
  }
  return ["", bodyHtml];
}

/** Encode plain text to safe HTML, trimming whitespace */
function htmlEncode(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function useEditorWorkspace(editionId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const q = useEditorQueries(editionId);

  // Editor state
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [bodyVersion, setBodyVersion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [articles, setArticles] = useState<typeof q.editionArticles>([]);
  const [removingArticle, setRemovingArticle] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("ai");

  const { handleTransform } = useAITransform();

  // Set edit fields when edition loads
  useEffect(() => {
    if (q.edition) {
      setEditTitle(q.edition.title);
      const [subtitle, body] = extractSubtitle(q.edition.body_html);
      setEditSubtitle(subtitle);
      setEditBody(body);
      setBodyVersion((v) => v + 1);
    }
  }, [q.edition?.id, q.edition?.body_html]);

  // Sync articles
  useEffect(() => {
    if (q.editionArticles) {
      setArticles(q.editionArticles);
    }
  }, [q.editionArticles]);

  // Save handler for autosave
  const handleSave = useCallback(async () => {
    if (!q.edition) return;
    const subtitleHtml = editSubtitle
      ? `<p data-subtitle="">${htmlEncode(editSubtitle)}</p>`
      : "";
    await api.newsletters.updateBody(q.edition.id, {
      title: editTitle,
      body_html: subtitleHtml + editBody,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
  }, [q.edition, editTitle, editSubtitle, editBody, queryClient, editionId]);

  const { isSynced, isSaving, error: saveError } = useAutosave({
    save: handleSave,
    deps: [editBody, editTitle, editSubtitle, q.edition?.id],
    enabled: !!q.edition,
  });

  // Actions
  const handleBack = useCallback(() => {
    navigate({ to: "/content/newsletters" });
  }, [navigate]);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!q.edition) return;
    try {
      await api.newsletters.updateStatus(q.edition.id, status);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      toast.success(t("editor.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [q.edition, editionId, queryClient, t]);

  const handleDuplicate = useCallback(async () => {
    if (!q.edition) return;
    try {
      const dup = await api.newsletters.duplicate(q.edition.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      toast.success(t("newsletters.newsletterDuplicated"));
      navigate({ to: `/content/newsletters/${dup.id}/edit` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [q.edition, editionId, queryClient, t, navigate]);

  const handleUnarchive = useCallback(async () => {
    if (!q.edition) return;
    try {
      await api.newsletters.updateStatus(q.edition.id, "building");
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      toast.success(t("editor.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [q.edition, editionId, queryClient, t]);

  const handleCategoryChange = useCallback(async (category: string | null) => {
    if (!q.edition) return;
    try {
      await api.newsletters.updateCategory(q.edition.id, category);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [q.edition, editionId, queryClient, t]);

  const handleAddTag = useCallback(async (tag: string) => {
    if (!q.edition) return;
    try {
      await api.newsletters.addTag(q.edition.id, tag);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [q.edition, editionId, queryClient, t]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!q.edition) return;
    try {
      await api.newsletters.removeTag(q.edition.id, tag);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [q.edition, editionId, queryClient, t]);

  const handleRemoveArticle = useCallback(async (contentID: string) => {
    if (!q.edition) return;
    setRemovingArticle(contentID);
    try {
      await api.newsletters.removeArticle(q.edition.id, contentID);
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
  }, [q.edition, editionId, queryClient, t]);

  const handleAddArticle = useCallback(async (contentID: string) => {
    if (!q.edition) return;
    try {
      await api.newsletters.addArticle(q.edition.id, contentID);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.articles(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.detail(editionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.articleNewsletterIds.all });
      toast.success(t("newsletters.articleAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [q.edition, editionId, queryClient, t]);

  const handleGenerateIntro = useCallback(async () => {
    if (!q.edition || generating) return;
    setGenerating(true);
    try {
      await api.newsletters.generateIntro(q.edition.id);
      toast.success(t("newsletters.introQueued"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
      setGenerating(false);
    }
  }, [q.edition, generating, t]);

  // Wait for intro generation
  useEffect(() => {
    if (!generating) return;
    const timeout = setTimeout(() => setGenerating(false), 90000);
    return () => clearTimeout(timeout);
  }, [generating]);

  useEffect(() => {
    if (!generating || !q.edition) return;
    const checkUpdate = async () => {
      try {
        const updated = await api.newsletters.get(q.edition.id);
        if (updated.body_html !== q.edition.body_html) {
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
  }, [generating, q.edition, t]);

  // Escape key: close sidebar first, then navigate back
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
    edition: q.edition,
    isLoading: q.isLoading,
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
    availableArticles: q.availableArticles,
    availableTags: q.availableTags,
    isSynced,
    isSaving,
    saveError,
    editionId,
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
