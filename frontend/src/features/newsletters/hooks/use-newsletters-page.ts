import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { api } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { useNewslettersFilter } from "./use-newsletters-filter";
import { useNewslettersMutations } from "./use-newsletters-mutations";

export type { SortKey } from "./use-newsletters-filter";

export function useNewslettersPage() {
  const { t } = useTranslation();
  const mutations = useNewslettersMutations();

  const { data: editions, isLoading, isError } = useQuery({
    queryKey: queryKeys.editions.all,
    queryFn: () => api.newsletters.list(),
  });

  const items = editions ?? [];
  const filter = useNewslettersFilter(items);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (mutations.showPreview) return;
      switch (e.key) {
        case "n":
          e.preventDefault();
          mutations.handleCreate();
          break;
        case "e":
          if (mutations.selectedItem) {
            e.preventDefault();
            mutations.handleEditNavigation();
          }
          break;
        case "a":
          if (mutations.selectedItem && mutations.selectedItem.status !== "archived") {
            e.preventDefault();
            mutations.handleArchive(mutations.selectedItem);
          }
          break;
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mutations.showPreview, mutations.selectedItem, mutations.handleCreate, mutations.handleEditNavigation, mutations.handleArchive]);

  // Wait for intro generation via SSE
  useEffect(() => {
    if (!mutations.generating) return;
    const timeout = setTimeout(() => mutations.setGenerating(false), 90000);
    return () => clearTimeout(timeout);
  }, [mutations.generating]);

  useEffect(() => {
    if (!mutations.generating || !mutations.selectedItem || !editions) return;
    const updated = editions.find((e) => e.id === mutations.selectedItem.id);
    if (updated && updated.body_html !== mutations.selectedItem.body_html) {
      mutations.setGenerating(false);
      mutations.setSelectedItem(updated);
      toast.success(t("newsletters.introReady"));
    }
  }, [editions, mutations.selectedItem, mutations.generating, t]);

  // Escape key closes panels
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (mutations.showPreview) { mutations.setShowPreview(false); mutations.setPreviewItem(null); return; }
        if (mutations.selectedItem) mutations.setSelectedItem(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mutations.showPreview, mutations.selectedItem]);

  return {
    // State from mutations
    ...mutations,
    // Data
    editions,
    isLoading,
    isError,
    items,
    ...filter,
  };
}
