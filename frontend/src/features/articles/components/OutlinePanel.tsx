import { useTranslation } from "react-i18next";
import type { OutlineItem } from "../hooks/use-outline";

interface OutlinePanelProps {
  items: OutlineItem[];
  onNavigate?: (slug: string) => void;
}

export function OutlinePanel({ items, onNavigate }: OutlinePanelProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <p className="text-xs text-[var(--color-text-tertiary)] italic">
        {t("articles.outline_empty", "No headings found")}
      </p>
    );
  }

  return (
    <nav className="space-y-0.5">
      {items.map((item, i) => (
        <button
          key={`${item.slug}-${i}`}
          onClick={() => onNavigate?.(item.slug)}
          className="block w-full text-left rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-subtle)] transition-colors truncate"
          style={{ paddingLeft: `${0.5 + (item.level - 1) * 1}rem` }}
        >
          {item.text}
        </button>
      ))}
    </nav>
  );
}
