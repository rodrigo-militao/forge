import { useState, useCallback, useMemo } from "react";
import type { ContentItem } from "../../../api/client";
import type { SortKey } from "../helpers";

export function useDigestFilters(digestItems: ContentItem[], usedSet: Set<string>) {
  const [activeTab, setActiveTab] = useState<string>("novos");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());

  const digestTabs = [
    { id: "todos", labelKey: "digest.tabTodos" },
    { id: "novos", labelKey: "digest.tabNovos" },
    { id: "selecionados", labelKey: "digest.tabSelecionados" },
    { id: "enviados", labelKey: "digest.tabEnviados" },
  ];

  const filteredByTab = useMemo(() => {
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
  }, [activeTab, digestItems, usedSet, selectedIDs]);

  const tabCounts = useMemo((): Record<string, number> => {
    const novos = digestItems.filter((c) => !usedSet.has(c.id)).length;
    const enviados = [...usedSet].filter((id) => digestItems.some((c) => c.id === id)).length;
    return {
      todos: digestItems.length,
      novos,
      selecionados: selectedIDs.size,
      enviados,
    };
  }, [digestItems, usedSet, selectedIDs]);

  const sortOptions: { value: string; label: string }[] = [
    { value: "newest", label: "Mais recentes" },
    { value: "oldest", label: "Mais antigos" },
    { value: "title", label: "Título" },
  ];

  const toggleSelected = useCallback((id: string) => {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return {
    activeTab,
    setActiveTab,
    sortBy,
    setSortBy,
    selectedIDs,
    setSelectedIDs,
    digestTabs,
    filteredByTab,
    tabCounts,
    sortOptions,
    toggleSelected,
  };
}
