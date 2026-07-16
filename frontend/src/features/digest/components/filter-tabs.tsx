import { useTranslation } from "react-i18next";

export interface FilterTabItem {
  id: string;
  labelKey: string;
}

interface FilterTabsProps {
  tabs: FilterTabItem[];
  active: string;
  onChange: (tab: string) => void;
  counts: Record<string, number>;
}

export function FilterTabs({ tabs, active, onChange, counts }: FilterTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            active === tab.id
              ? "bg-[var(--color-accent-primary)] text-white"
              : "bg-white/10 text-[var(--color-text-muted)] hover:bg-white/[0.15] hover:text-[var(--color-bg-surface)]"
          }`}
        >
          {t(tab.labelKey)}
          <span className="ml-1.5 opacity-70">({counts[tab.id] ?? 0})</span>
        </button>
      ))}
    </div>
  );
}
