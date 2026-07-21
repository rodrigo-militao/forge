import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { api, type ContentItem } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";

export function useDigestMutations() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const runningSinceRef = useRef(0);

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

  // Safety timeout
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setRunning(false), 60000);
    return () => clearTimeout(timer);
  }, [running]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.content.delete(id);
        queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
        toast.success(t("digest.deleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
    },
    [queryClient, t],
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

  return {
    running,
    setRunning,
    runningSinceRef,
    showJobs,
    setShowJobs,
    handleRun,
    handleDelete,
    handleCreateArticle,
    handleCreateIdea,
  };
}
