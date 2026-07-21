import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDigestQueries } from "./use-digest-queries";
import { useDigestFilters } from "./use-digest-filters";
import { useDigestSelection } from "./use-digest-selection";
import { useDigestMutations } from "./use-digest-mutations";
import { useDigestNewsletter } from "./use-digest-newsletter";

export function useDigestPage() {
  const { t } = useTranslation();
  const mutations = useDigestMutations();
  const queries = useDigestQueries(mutations.showJobs);
  const filters = useDigestFilters(queries.digestItems, queries.usedSet);
  const selection = useDigestSelection(queries.digestItems);
  const newsletter = useDigestNewsletter();
  const handledJobRef = useRef<string | null>(null);

  // Pick up an active job on page load (once per job ID)
  useEffect(() => {
    const activeJobID = queries.stats?.active_job_id;
    if (!activeJobID) return;
    if (handledJobRef.current === activeJobID) return;
    const status = queries.stats?.active_job_status;
    if (status !== "processing" && status !== "pending") return;
    if (queries.content === undefined) return;
    handledJobRef.current = activeJobID;
    mutations.setRunning(true);
    mutations.runningSinceRef.current = Date.now();
  }, [queries.stats?.active_job_id, queries.stats?.active_job_status, queries.content]);

  // Detect completion via dataUpdatedAt
  useEffect(() => {
    if (!mutations.running || !queries.dataUpdatedAt) return;
    if (queries.dataUpdatedAt > mutations.runningSinceRef.current) {
      mutations.runningSinceRef.current = 0;
      mutations.setRunning(false);
    }
  }, [queries.dataUpdatedAt, mutations.running]);

  // Close detail panel and keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === "d" && !mutations.running) {
        e.preventDefault();
        mutations.handleRun();
      }
      if (key === "escape") {
        selection.setSelectedArticle(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mutations.running, mutations.handleRun, selection.setSelectedArticle]);

  const stepLabel = t("digest.discovering");

  return {
    // Mutations
    ...mutations,
    // Query data
    ...queries,
    // Filters
    ...filters,
    // Selection
    ...selection,
    // Newsletter
    ...newsletter,
    stepLabel,
  };
}
