import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api/client";

export function DigestPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
    refetchInterval: () => (runningRef.current ? 5000 : false),
  });

  const items = content?.filter((c) => c.product === "digest") ?? [];

  const handleRun = useCallback(async () => {
    setRunning(true);
    runningRef.current = true;
    const prevCount = items.length;

    try {
      await api.digest.run();
      toast.success("Job queued");

      // Poll every 5s for up to 60s, stop when count increases
      const startTime = Date.now();
      const poll = setInterval(async () => {
        await queryClient.refetchQueries({ queryKey: ["content"] });
        const fresh = queryClient.getQueryData(["content"]);
        const freshItems = Array.isArray(fresh) ? fresh.filter((c: any) => c.product === "digest") : [];

        if (freshItems.length > prevCount) {
          clearInterval(poll);
          setRunning(false);
          toast.success(`${freshItems.length} items — see Library`);
        } else if (Date.now() - startTime > 60_000) {
          clearInterval(poll);
          setRunning(false);
          toast("Check Library for results");
        }
      }, 5000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setRunning(false);
    }
  }, [items.length, queryClient]);

  if (isLoading) return <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[var(--font-display)] text-2xl">{t("digest.title")}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["content"] })}
            className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={16} className={running ? "animate-pulse" : ""} />
            {running ? t("digest.running") : t("digest.run")}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 && !running && (
          <p className="text-sm text-[var(--color-text-muted)]">{t("digest.noContent")}</p>
        )}
        {running && items.length === 0 && (
          <p className="text-sm text-[var(--color-accent-primary)] animate-pulse">
            Processing articles…
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4"
          >
            <h3 className="font-medium text-[var(--color-bg-surface)]">
              {item.title || "(no title)"}
            </h3>
            {item.body_markdown && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {item.body_markdown}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3">
              {(item.metadata as { source_url?: string })?.source_url && (
                <a
                  href={(item.metadata as { source_url?: string }).source_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer text-xs text-[var(--color-accent-primary)] hover:underline"
                >
                  Read original ↗
                </a>
              )}
              <span className="inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
