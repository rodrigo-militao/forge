import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { api, type ContentItem, type NewsletterEdition } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { useOutsideClick } from "../../../hooks/useOutsideClick";
import { useDigestQueries } from "./use-digest-queries";
import type { SortKey } from "../helpers";

export function useDigestPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("novos");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selectedArticle, setSelectedArticle] = useState<ContentItem | null>(null);
  const runningSinceRef = useRef(0);

  // Newsletter selector state
  const [newsletterAnchor, setNewsletterAnchor] = useState<{
    articleId: string;
    top: number;
    right: number;
  } | null>(null);
  const newsletterOpen = newsletterAnchor?.articleId ?? null;
  const [draftNewsletters, setDraftNewsletters] = useState<NewsletterEdition[]>([]);
  const [creatingNewsletter, setCreatingNewsletter] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const {
    content,
    isLoading,
    isError,
    dataUpdatedAt,
    usedIDs,
    usedSet,
    stats,
    jobs,
    sources,
    interestsData,
    hasActiveSources,
    hasActiveInterests,
    digestItems,
    contextualTipKey,
    user,
  } = useDigestQueries(showJobs);

  // Digest tab definitions
  const digestTabs = [
    { id: "todos", labelKey: "digest.tabTodos" },
    { id: "novos", labelKey: "digest.tabNovos" },
    { id: "selecionados", labelKey: "digest.tabSelecionados" },
    { id: "enviados", labelKey: "digest.tabEnviados" },
  ];

  // Tab-based filtering
  const filteredByTab = (() => {
    switch (activeTab) {
      case "todos":
        return digestItems;
      case "novos":
        return digestItems.filter((c) => !usedSet.has(c.id));
      case "selecionados":
        return digestItems.filter((c) => selectedIDs.has(c.id));
      case "enviados":
        return digestItems.filter((c) => usedSet.has(c.id));
      default:
        return digestItems;
    }
  })();

  // Tab counts
  const tabCounts: Record<string, number> = {
    todos: digestItems.length,
    novos: digestItems.filter((c) => !usedSet.has(c.id)).length,
    selecionados: selectedIDs.size,
    enviados: [...usedSet].filter((id) => digestItems.some((c) => c.id === id)).length,
  };

  // Sort options
  const sortOptions = (["newest", "oldest", "title"] as const).map((key) => ({
    value: key,
    label: t(`digest.sort${key.charAt(0).toUpperCase() + key.slice(1)}`),
  }));

  // Pick up an active job on page load
  useEffect(() => {
    if (running) return;
    if (stats?.active_job_status !== "processing" && stats?.active_job_status !== "pending") return;
    if (content === undefined) return;
    setRunning(true);
    runningSinceRef.current = Date.now();
  }, [running, stats?.active_job_status, content]);

  // Safety timeout
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setRunning(false), 60000);
    return () => clearTimeout(timer);
  }, [running]);

  // Detect completion via dataUpdatedAt
  useEffect(() => {
    if (!running || !dataUpdatedAt) return;
    if (dataUpdatedAt > runningSinceRef.current) {
      runningSinceRef.current = 0;
      setRunning(false);
    }
  }, [dataUpdatedAt, running]);

  // Close detail panel on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedArticle(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Close newsletter selector on outside click
  useOutsideClick(selectorRef, () => setNewsletterAnchor(null), !!newsletterOpen);

  const handleRun = useCallback(async () => {
    setRunning(true);
    runningSinceRef.current = Date.now();
    try {
      await api.digest.run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("digest.runFailed");
      if (msg.includes("already in progress")) {
        toast(msg, { icon: "ℹ️" });
      } else {
        toast.error(msg);
      }
      setRunning(false);
    }
  }, [t]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === "d" && !running) {
        e.preventDefault();
        handleRun();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [running, handleRun]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCardClick = useCallback((id: string) => {
    const item = digestItems.find((c) => c.id === id);
    if (item) setSelectedArticle(item);
  }, [digestItems]);

  const openNewsletterSelector = useCallback(async (target: string, e?: React.MouseEvent) => {
    const btnRect = (e?.currentTarget as HTMLElement)?.getBoundingClientRect();
    try {
      const editions = await api.newsletters.list({ status: "building" });
      setDraftNewsletters(editions);
    } catch {
      setDraftNewsletters([]);
    }
    setNewsletterAnchor(btnRect ? {
      articleId: target,
      top: btnRect.bottom + 6,
      right: window.innerWidth - btnRect.right,
    } : null);
  }, []);

  const addToNewsletter = useCallback(
    async (newsletterID: string, articleID: string) => {
      try {
        await api.newsletters.addArticle(newsletterID, articleID);
        queryClient.invalidateQueries({ queryKey: queryKeys.articleNewsletterIds.all });
        toast.success(t("editor.saved"));
        setNewsletterAnchor(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
    },
    [queryClient, t],
  );

  const createAndAddToNewsletter = useCallback(
    async (articleID: string) => {
      setCreatingNewsletter(true);
      try {
        const edition = await api.newsletters.create({ title: "New newsletter" });
        await api.newsletters.addArticle(edition.id, articleID);
        queryClient.invalidateQueries({ queryKey: queryKeys.articleNewsletterIds.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
        toast.success(t("digest.newsletterCreated"));
        setNewsletterAnchor(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
      setCreatingNewsletter(false);
    },
    [queryClient, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.content.delete(id);
        queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
        setSelectedIDs((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (selectedArticle?.id === id) setSelectedArticle(null);
        toast.success(t("digest.deleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
    },
    [queryClient, t, selectedArticle],
  );

  const handleCreateArticle = useCallback(
    (item: ContentItem) => {
      const params = new URLSearchParams();
      if (item.title) params.set("title", item.title);
      const sourceUrl = item.metadata?.source_url as string | undefined;
      if (sourceUrl) params.set("source_url", sourceUrl);
      navigate({ to: `/content/articles?${params.toString()}` });
    },
    [navigate],
  );

  const handleCreateIdea = useCallback(
    (item: ContentItem) => {
      const params = new URLSearchParams();
      if (item.title) params.set("title", item.title);
      const sourceUrl = item.metadata?.source_url as string | undefined;
      if (sourceUrl) params.set("source_url", sourceUrl);
      navigate({ to: `/content/ideas?${params.toString()}` });
    },
    [navigate],
  );

  // Processing step label
  const stepLabel = t("digest.discovering");

  return {
    // State
    running, selectedIDs, setSelectedIDs, activeTab, setActiveTab, sortBy, setSortBy,
    selectedArticle, setSelectedArticle, showJobs, setShowJobs,
    newsletterAnchor, selectorRef, draftNewsletters, creatingNewsletter,

    // Query data
    content, isLoading, isError, stats, jobs, usedIDs,

    // Derived
    digestItems, filteredByTab, tabCounts, sortOptions, digestTabs, contextualTipKey,
    usedSet, hasActiveSources, hasActiveInterests, stepLabel, user,

    // Callbacks
    toggleSelected, handleCardClick, openNewsletterSelector,
    addToNewsletter, createAndAddToNewsletter, handleDelete,
    handleCreateArticle, handleCreateIdea, handleRun,
  };
}
