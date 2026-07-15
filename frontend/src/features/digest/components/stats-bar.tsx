import { useTranslation } from "react-i18next";
import type { DigestStats } from "../../../api/client";

interface StatsBarProps {
  stats: DigestStats | undefined;
  selectedCount: number;
}

export function formatTimeAgo(dateStr: string | null, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("digest.justNow");
  if (diffMin < 60) return t("digest.minutesAgo", { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("digest.hoursAgo", { n: diffH });
  return t("digest.daysAgo", { n: Math.floor(diffH / 24) });
}

export function StatsBar({ stats }: StatsBarProps) {
  const { t } = useTranslation();
  const discovered = stats?.total_count ?? 0;
  const newsletters = stats?.draft_newsletters ?? 0;
  const lastAgo = stats?.last_discovery
    ? formatTimeAgo(stats.last_discovery, t)
    : t("digest.statsNever");

  const isActive = stats?.active_job_status === "pending" || stats?.active_job_status === "processing";

  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-[var(--color-text-muted)]">
        {discovered} {t("digest.statsDiscovered").toLowerCase()} · {newsletters} {t("digest.statsNewsletters").toLowerCase()} · {t("digest.statsLastDiscovery").toLowerCase()} {lastAgo}
      </p>
      {isActive && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-primary)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent-primary)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent-primary)]" />
          {t("digest.activeJob")}
        </span>
      )}
    </div>
  );
}
