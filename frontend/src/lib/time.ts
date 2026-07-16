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
