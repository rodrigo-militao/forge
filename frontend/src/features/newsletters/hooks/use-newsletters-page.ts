import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { api, type ArticleRef, type NewsletterEdition } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";

type SortKey = "newest" | "oldest" | "title";

export type { SortKey };

export function useNewslettersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<NewsletterEdition | null>(null);
  const [generating, setGenerating] = useState(false);
  const [articles, setArticles] = useState<ArticleRef[]>([]);
  const [removingArticle, setRemovingArticle] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<NewsletterEdition | null>(null);
  const [activeTab, setActiveTab] = useState<string>("todas");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const articlesReqRef = useRef(0);

  const { data: editions, isLoading, isError } = useQuery({
    queryKey: queryKeys.editions.all,
    queryFn: () => api.newsletters.list(),
  });

  const handleCreate = useCallback(async () => {
    try {
      const edition = await api.newsletters.create({ title: t("newsletters.newNewsletter") });
      setSelectedItem(edition);
      setPreviewItem(null);
      setShowPreview(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [queryClient, t]);

  const handleSelect = useCallback(async (item: NewsletterEdition) => {
    setSelectedItem(item);
    setShowPreview(false);
    setPreviewItem(null);
    const reqId = ++articlesReqRef.current;
    setArticles([]);
    try {
      const arts = await api.newsletters.articles(item.id);
      if (reqId !== articlesReqRef.current) return;
      setArticles(arts);
    } catch {
      toast.error(t("newsletters.failedToLoadArticles"));
    }
  }, [t]);

  const handleEditNavigation = useCallback((item?: NewsletterEdition) => {
    const target = item ?? selectedItem;
    if (!target) return;
    navigate({ to: `/content/newsletters/${target.id}/edit` });
  }, [navigate, selectedItem]);

  const handlePreview = useCallback((item?: NewsletterEdition) => {
    const target = item ?? selectedItem;
    if (!target) return;
    setPreviewItem(target);
    setShowPreview(true);
  }, [selectedItem]);

  const handleDuplicate = useCallback((item: NewsletterEdition) => {
    const name = item.title || t("newsletters.noTitle");
    setConfirmDialog({
      message: `${t("newsletters.confirmDuplicate")} "${name}"?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const dup = await api.newsletters.duplicate(item.id);
          toast.success(t("newsletters.newsletterDuplicated"));
          queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
          setSelectedItem(dup);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("newsletters.failedToDuplicate"));
        }
      },
    });
  }, [queryClient, t]);

  const handleCloseDetailPanel = useCallback(() => setSelectedItem(null), []);

  const handleArchive = useCallback((item: NewsletterEdition) => {
    const name = item.title || t("newsletters.noTitle");
    setConfirmDialog({
      message: `${t("newsletters.confirmArchive")} "${name}"?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.newsletters.updateStatus(item.id, "archived");
          queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
          setSelectedItem((prev) => prev?.id === item.id ? { ...prev, status: "archived" as const } : prev);
          toast.success(t("newsletters.archivedSuccessfully"));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
        }
      },
    });
  }, [queryClient, t]);

  const handleUnarchive = useCallback(async () => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateStatus(selectedItem.id, "building");
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      setSelectedItem((prev) => prev ? { ...prev, status: "building" as const } : null);
      toast.success(t("newsletters.unarchivedSuccessfully"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient, t]);

  const handleStatusChange = useCallback((status: string) => {
    if (!selectedItem) return;
    if (status === "published") {
      const name = selectedItem.title || t("newsletters.noTitle");
      setConfirmDialog({
        message: `${t("newsletters.confirmPublish")} "${name}"?`,
        onConfirm: async () => {
          setConfirmDialog(null);
          if (!selectedItem) return;
          try {
            await api.newsletters.updateStatus(selectedItem.id, "published");
            setSelectedItem((prev) => prev ? { ...prev, status: "published" as const } : null);
            queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
            toast.success(t("editor.statusUpdated"));
          } catch (err) {
            toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
          }
        },
      });
      return;
    }
    (async () => {
      try {
        await api.newsletters.updateStatus(selectedItem.id, status);
        setSelectedItem((prev) => prev ? { ...prev, status: status as NewsletterEdition["status"] } : null);
        queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
        toast.success(t("editor.statusUpdated"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
      }
    })();
  }, [selectedItem, queryClient, t]);

  const handleCategoryChange = useCallback(async (category: string | null) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateCategory(selectedItem.id, category);
      setSelectedItem((prev) => prev ? { ...prev, category } : null);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient, t]);

  const handleDestinationChange = useCallback(async (destination: string | null) => {
    if (!selectedItem) return;
    try {
      await api.newsletters.updateDestination(selectedItem.id, destination);
      setSelectedItem((prev) => prev ? { ...prev, destination } : null);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.destinations });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
  }, [selectedItem, queryClient, t]);

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
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.articleNewsletterIds.all });
      toast.success(t("newsletters.articleAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failedToAdd"));
    }
  }, [selectedItem, queryClient, t]);

  const handleRemoveArticle = useCallback(async (contentID: string) => {
    if (!selectedItem) return;
    setRemovingArticle(contentID);
    try {
      await api.newsletters.removeArticle(selectedItem.id, contentID);
      setArticles((prev) => prev.filter((a) => a.content_id !== contentID));
      const freshEdition = await api.newsletters.get(selectedItem.id);
      setSelectedItem(freshEdition);
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.articleNewsletterIds.all });
      toast.success(t("newsletters.articleRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("newsletters.failed"));
    }
    setRemovingArticle(null);
  }, [selectedItem, queryClient, t]);

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

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showPreview) return;
      switch (e.key) {
        case "n":
          e.preventDefault();
          handleCreate();
          break;
        case "e":
          if (selectedItem) {
            e.preventDefault();
            handleEditNavigation();
          }
          break;
        case "a":
          if (selectedItem && selectedItem.status !== "archived") {
            e.preventDefault();
            handleArchive(selectedItem);
          }
          break;
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showPreview, selectedItem, handleCreate, handleEditNavigation, handleArchive]);

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
      setSelectedItem(updated);
      toast.success(t("newsletters.introReady"));
    }
  }, [editions, selectedItem, generating, t]);

  // Escape key closes panels
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showPreview) { setShowPreview(false); setPreviewItem(null); return; }
        if (selectedItem) setSelectedItem(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showPreview, selectedItem]);

  // --- Derived data ---
  const items = editions ?? [];
  const buildingCount = items.filter((i) => i.status === "building").length;
  const readyCount = items.filter((i) => i.status === "ready").length;
  const publishedCount = items.filter((i) => i.status === "published").length;
  const archivedCount = items.filter((i) => i.status === "archived").length;

  const tabCounts: Record<string, number> = {
    todas: items.length,
    building: buildingCount,
    ready: readyCount,
    published: publishedCount,
    archived: archivedCount,
  };

  const filteredByTab = activeTab === "todas"
    ? items
    : items.filter((i) => i.status === activeTab);

  function sortItems(items: NewsletterEdition[], sort: SortKey) {
    return [...items].sort((a, b) => {
      if (sort === "newest") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sort === "oldest") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return (a.title ?? "").localeCompare(b.title ?? "");
    });
  }

  const sortedItems = sortItems(filteredByTab, sortBy);

  const sortOptions = (["newest", "oldest", "title"] as const).map((key) => ({
    value: key,
    label: t(`newsletters.sort${key.charAt(0).toUpperCase() + key.slice(1)}`),
  }));

  const newsletterTabs = [
    { id: "todas", labelKey: "newsletters.tabTodas" },
    { id: "building", labelKey: "newsletters.tabBuilding" },
    { id: "ready", labelKey: "newsletters.tabReady" },
    { id: "published", labelKey: "newsletters.tabPublished" },
    { id: "archived", labelKey: "newsletters.tabArchived" },
  ];

  return {
    // State
    selectedItem, setSelectedItem, generating, setGenerating,
    articles, removingArticle, showPreview, setShowPreview,
    previewItem, setPreviewItem,
    activeTab, setActiveTab, sortBy, setSortBy,
    confirmDialog, setConfirmDialog,

    // Data
    editions, isLoading, isError, items, sortedItems,
    buildingCount, readyCount, publishedCount, archivedCount,
    tabCounts, filteredByTab, sortOptions, newsletterTabs,

    // Callbacks
    handleCreate, handleSelect, handleEditNavigation, handlePreview,
    handleDuplicate, handleCloseDetailPanel, handleArchive, handleUnarchive,
    handleStatusChange, handleCategoryChange, handleDestinationChange,
    handleAddArticle, handleRemoveArticle, handleGenerateIntro,
  };
}
