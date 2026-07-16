import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { FilterTabs } from "../../../components/ui/filter-tabs";
import type { FilterTabItem } from "../../../components/ui/filter-tabs";
import { SortSelect } from "../../../components/ui/sort-select";

interface DigestToolbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  sortOptions: { value: string; label: string }[];
  digestTabs: FilterTabItem[];
  tabCounts: Record<string, number>;
  selectedIDs: Set<string>;
  openNewsletterSelector: (target: string, e?: React.MouseEvent) => void;
}

export function DigestToolbar({
  activeTab,
  setActiveTab,
  sortBy,
  setSortBy,
  sortOptions,
  digestTabs,
  tabCounts,
  selectedIDs,
  openNewsletterSelector,
}: DigestToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-3 flex items-center justify-between">
      <FilterTabs tabs={digestTabs} active={activeTab} onChange={setActiveTab} counts={tabCounts} />
      <div className="flex items-center gap-2">
        <SortSelect
          value={sortBy}
          onChange={(v) => setSortBy(v)}
          label={t("digest.sortLabel")}
          options={sortOptions}
        />
        <div className="relative">
          <button
            onClick={(e) => openNewsletterSelector("batch", e)}
            disabled={selectedIDs.size === 0}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-all hover:bg-[var(--color-accent-primary)]/10 active:scale-[0.97] disabled:opacity-30 disabled:cursor-default disabled:active:scale-100 disabled:hover:bg-transparent"
          >
            <Mail size={16} />
            {t("digest.addToNewsletter", { count: selectedIDs.size })}
          </button>
        </div>
      </div>
    </div>
  );
}
