import type { DigestJob } from "../../api/client";

export type SortKey = "newest" | "oldest" | "title";

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function jobTypeDisplayName(type: string, t: (key: string) => string): string {
  const key = `digest.jobType${capitalize(type)}`;
  const translated = t(key);
  return translated !== key ? translated : type;
}

export function StatusDot({ status }: { status: DigestJob["status"] }) {
  const colors: Record<string, string> = {
    pending: "bg-[var(--color-text-muted)]",
    processing: "bg-[var(--color-accent-primary)] animate-pulse",
    done: "bg-[var(--color-accent-success)]",
    failed: "bg-[var(--color-accent-danger)]",
  };
  return <span className={`h-2 w-2 rounded-full ${colors[status] ?? "bg-[var(--color-text-muted)]"}`} />;
}
