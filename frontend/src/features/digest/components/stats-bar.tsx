import { useTranslation } from "react-i18next";
import { Compass, CheckCircle2, FileText, Clock } from "lucide-react";
import type { DigestStats } from "../../../api/client";

interface StatsBarProps {
  stats: DigestStats | undefined;
  selectedCount: number;
}

function formatTimeAgo(dateStr: string | null, t: (key: string, opts?: object) => string): string {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("digest.justNow");
  if (diffMin < 60) return t("digest.minutesAgo", { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("digest.hoursAgo", { n: diffH });
  return t("digest.daysAgo", { n: Math.floor(diffH / 24) });
}

export function StatsBar({ stats, selectedCount }: StatsBarProps) {
  const { t } = useTranslation();

  const blocks = [
    {
      icon: Compass,
      count: stats?.total_count ?? 0,
      label: t("digest.statsDiscovered"),
      sub: stats?.last_discovery
        ? formatTimeAgo(stats.last_discovery, t)
        : null,
      value: stats?.total_count ?? 0,
    },
    {
      icon: CheckCircle2,
      count: selectedCount,
      label: t("digest.statsSelected"),
      sub: t("digest.statsNewsletters"),
      value: selectedCount,
    },
    {
      icon: FileText,
      count: stats?.draft_newsletters ?? 0,
      label: t("digest.statsNewsletters"),
      sub: t("digest.statsSelected"),
      value: stats?.draft_newsletters ?? 0,
    },
    {
      icon: Clock,
      count: 0,
      label: t("digest.statsLastDiscovery"),
      sub: stats?.last_discovery ? formatTimeAgo(stats.last_discovery, t) : t("digest.statsNever"),
      value: 0,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {blocks.map((block, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 rounded-lg border border-[var(--color-border)]/20 bg-white/[0.03] px-4 py-3"
        >
          <block.icon
            size={20}
            className="shrink-0 text-[var(--color-text-muted)]"
          />
          <div className="min-w-0">
            <div className="font-mono text-lg font-semibold text-[var(--color-bg-surface)]">
              {idx === 3 ? "" : block.count}
            </div>
            <div className="truncate text-xs text-[var(--color-text-muted)]">
              {idx === 3 ? block.sub : block.label}
            </div>
            {idx !== 3 && block.sub && (
              <div className="truncate text-[11px] text-[var(--color-text-muted)]/60">
                {block.sub}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
