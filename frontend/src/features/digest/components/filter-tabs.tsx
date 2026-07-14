import { useTranslation } from "react-i18next";

export type FilterTab = "todos" | "novos" | "selecionados" | "enviados";

interface FilterTabsProps {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
  counts: Record<FilterTab, number>;
}

const TABS: FilterTab[] = ["todos", "novos", "selecionados", "enviados"];

export function FilterTabs({ active, onChange, counts }: FilterTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            active === tab
              ? "bg-[var(--color-accent-primary)] text-white"
              : "bg-white/10 text-[var(--color-text-muted)] hover:bg-white/[0.15] hover:text-[var(--color-bg-surface)]"
          }`}
        >
          {t(`digest.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
          <span className="ml-1.5 opacity-70">({counts[tab]})</span>
        </button>
      ))}
    </div>
  );
}
