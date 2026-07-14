import { useTranslation } from "react-i18next";
import { Compass, FileText, Clock } from "lucide-react";
import type { DigestStats } from "../../../api/client";

interface StatsBarProps {
  stats: DigestStats | undefined;
  selectedCount: number;
}

function formatTimeAgo(dateStr: string | null, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("digest.justNow");
  if (diffMin < 60) return t("digest.minutesAgo", { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("digest.hoursAgo", { n: diffH });
  return t("digest.daysAgo", { n: Math.floor(diffH / 24) });
}

export function StatsBar({ stats, selectedCount: _selectedCount }: StatsBarProps) {
  const { t } = useTranslation();

  const blocks = [
    {
      icon: Compass,
      label: t("digest.statsDiscovered"),
      value: stats?.total_count ?? 0,
      sub: stats?.last_discovery
        ? formatTimeAgo(stats.last_discovery, t)
        : null,
    },
    {
      icon: FileText,
      label: t("digest.statsNewsletters"),
      value: stats?.draft_newsletters ?? 0,
    },
    {
      icon: Clock,
      label: stats?.last_discovery
        ? `${t("digest.statsLastDiscovery")} · ${formatTimeAgo(stats.last_discovery, t)}`
        : `${t("digest.statsLastDiscovery")} · ${t("digest.statsNever")}`,
      value: "—",
    },
  ];

  return (
    <div className="flex gap-4">
      {blocks.map((block, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2"
        >
          <block.icon
            size={16}
            className="shrink-0 text-[var(--color-text-muted)]"
          />
          <div className="min-w-0">
            <div className="font-mono text-sm font-semibold text-[var(--color-bg-surface)]">
              {block.value}
            </div>
            <div className="truncate text-xs text-[var(--color-text-muted)]">
              {block.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
