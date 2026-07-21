import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { sortItems, type SortKey } from "../../../lib/sort";
import type { NewsletterEdition } from "../../../api/client";

export type { SortKey };

export function useNewslettersFilter(items: NewsletterEdition[]) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("todas");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const buildingCount = items.filter((i) => i.status === "building").length;
  const readyCount = items.filter((i) => i.status === "ready").length;
  const publishedCount = items.filter((i) => i.status === "published").length;
  const archivedCount = items.filter((i) => i.status === "archived").length;

  const tabCounts: Record<string, number> = useMemo(() => ({
    todas: items.length,
    building: buildingCount,
    ready: readyCount,
    published: publishedCount,
    archived: archivedCount,
  }), [items.length, buildingCount, readyCount, publishedCount, archivedCount]);

  const filteredByTab = useMemo(
    () => (activeTab === "todas" ? items : items.filter((i) => i.status === activeTab)),
    [activeTab, items],
  );

  const sortedItems = useMemo(() => sortItems(filteredByTab, sortBy, "updated_at"), [filteredByTab, sortBy]);

  const sortOptions = useMemo(
    () =>
      (["newest", "oldest", "title"] as const).map((key) => ({
        value: key,
        label: t(`newsletters.sort${key.charAt(0).toUpperCase() + key.slice(1)}`),
      })),
    [t],
  );

  const newsletterTabs = [
    { id: "todas", labelKey: "newsletters.tabTodas" },
    { id: "building", labelKey: "newsletters.tabBuilding" },
    { id: "ready", labelKey: "newsletters.tabReady" },
    { id: "published", labelKey: "newsletters.tabPublished" },
    { id: "archived", labelKey: "newsletters.tabArchived" },
  ];

  return {
    activeTab,
    setActiveTab,
    sortBy,
    setSortBy,
    tabCounts,
    filteredByTab,
    sortedItems,
    sortOptions,
    newsletterTabs,
  };
}
