import { useTranslation } from "react-i18next";
import type { DocumentStats } from "../hooks/use-document-stats";

interface DocumentStatsPanelProps {
  stats: DocumentStats & { references: number };
}

export function DocumentStatsPanel({ stats }: DocumentStatsPanelProps) {
  const { t } = useTranslation();

  const rows: { label: string; value: string | number }[] = [
    { label: t("articles.words", "Words"), value: stats.words },
    { label: t("articles.characters", "Characters"), value: stats.characters },
    {
      label: t("articles.reading_time", "Reading time"),
      value: `${stats.readingTimeMinutes} ${t("articles.min_read", "min read")}`,
    },
    { label: t("articles.headings", "Headings"), value: stats.headings },
    { label: t("articles.images", "Images"), value: stats.images },
    { label: t("articles.references", "References"), value: stats.references },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">{row.label}</span>
          <span className="text-xs font-medium text-[var(--color-text-primary)]">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
