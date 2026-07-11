import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, RefreshCw, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { api } from "../api/client";
import { useJobPolling } from "../hooks/useJobPolling";
import { useSSE } from "../hooks/useSSE";

export function DigestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());

  useSSE();

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
  });

  const items = content?.filter((c) => c.product === "digest") ?? [];

  useJobPolling(running, items.length, {
    interval: 5000,
    filter: (c) => c.product === "digest",
    onComplete: (newItems) => {
      setRunning(false);
      toast.success(`${newItems.length} new articles`);
    },
    onTimeout: () => {
      setRunning(false);
      toast("Check for new articles");
    },
  });

  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      await api.digest.run();
      toast.success("Job queued");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setRunning(false);
    }
  }, []);

  const handleAssembleEdition = useCallback(async () => {
    const ids = Array.from(selectedIDs);
    if (ids.length === 0) return;
    try {
      await api.digest.assembleEdition(ids);
      toast.success("Edition created");
      navigate({ to: "/library" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [selectedIDs, navigate]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
          <button
            onClick={handleAssembleEdition}
            disabled={selectedIDs.size === 0}
            className="cursor-pointer flex items-center gap-2 rounded-lg border border-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)] hover:text-white disabled:opacity-50"
          >
            <FileText size={16} />
            {t("digest.assembleEdition")} ({selectedIDs.size})
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
            className={`rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4 transition-colors ${
              selectedIDs.has(item.id) ? "ring-1 ring-[var(--color-accent-primary)]" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <input
                type="checkbox"
                checked={selectedIDs.has(item.id)}
                onChange={() => toggleSelected(item.id)}
                className="mt-1 h-4 w-4 cursor-pointer accent-[var(--color-accent-primary)]"
              />
              <div className="flex-1">
                <h3 className="font-medium">
                  {(item.metadata as { source_url?: string })?.source_url ? (
                    <a
                      href={(item.metadata as { source_url?: string }).source_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-[var(--color-bg-surface)] transition-colors hover:text-[var(--color-accent-primary)]"
                    >
                      {item.title || "(no title)"}
                    </a>
                  ) : (
                    <span className="text-[var(--color-bg-surface)]">
                      {item.title || "(no title)"}
                    </span>
                  )}
                </h3>
                {item.body_markdown && (
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {item.body_markdown}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
