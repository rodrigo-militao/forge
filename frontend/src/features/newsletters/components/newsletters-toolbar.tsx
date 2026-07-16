import { useTranslation } from "react-i18next";
import { FilterTabs } from "../../../components/ui/filter-tabs";
import type { FilterTabItem } from "../../../components/ui/filter-tabs";
import { SortSelect } from "../../../components/ui/sort-select";
import { Plus } from "lucide-react";

interface NewslettersToolbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  sortOptions: { value: string; label: string }[];
  newsletterTabs: FilterTabItem[];
  tabCounts: Record<string, number>;
  onCreate: () => void;
}

export function NewslettersToolbar({
  activeTab,
  setActiveTab,
  sortBy,
  setSortBy,
  sortOptions,
  newsletterTabs,
  tabCounts,
  onCreate,
}: NewslettersToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex items-center justify-between">
      <FilterTabs tabs={newsletterTabs} active={activeTab} onChange={setActiveTab} counts={tabCounts} />
      <div className="flex items-center gap-2">
        <SortSelect
          value={sortBy}
          onChange={(v) => setSortBy(v)}
          label={t("digest.sortLabel")}
          options={sortOptions}
        />
        <button
          onClick={onCreate}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-primary)]/20 transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-accent-primary)]/90 hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/25 hover:scale-[1.04] active:scale-[0.96]"
        >
          <Plus size={17} strokeWidth={2.5} />
          {t("newsletters.newNewsletter")}
        </button>
      </div>
    </div>
  );
}
