import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, FileText, RefreshCw, Sparkles, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../api/client";

export function DigestPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [assembling, setAssembling] = useState(false);

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

      const startTime = Date.now();
      const poll = setInterval(async () => {
        await queryClient.refetchQueries({ queryKey: ["content"] });
        const fresh = queryClient.getQueryData(["content"]);
        const freshItems = Array.isArray(fresh) ? fresh.filter((c: any) => c.product === "digest") : [];

        if (freshItems.length > prevCount) {
          clearInterval(poll);
          setRunning(false);
          toast.success(`${freshItems.length - prevCount} new articles — review below`);
        } else if (Date.now() - startTime > 60_000) {
          clearInterval(poll);
          setRunning(false);
          toast("Check for new articles");
        }
      }, 5000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setRunning(false);
    }
  }, [items.length, queryClient]);

  const handleAssembleEdition = useCallback(async () => {
    setAssembling(true);
    const prevCount = items.length;
    try {
      await api.digest.assembleEdition();
      toast.success("Edition assembly queued");
      const start = Date.now();
      const poll = setInterval(async () => {
        await queryClient.refetchQueries({ queryKey: ["content"] });
        const fresh = queryClient.getQueryData(["content"]);
        const freshItems = Array.isArray(fresh) ? fresh.filter((c: any) => c.product === "digest") : [];

        if (freshItems.length > prevCount || Date.now() - start > 90_000) {
          clearInterval(poll);
          setAssembling(false);
          if (freshItems.length > prevCount) {
            toast.success("Edition ready!");
          }
        }
      }, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setAssembling(false);
    }
  }, [items.length, queryClient]);

  const handleApprove = useCallback(
    async (id: string) => {
      await api.content.approve(id);
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.success("Approved");
    },
    [queryClient],
  );

  const handleReject = useCallback(
    async (id: string) => {
      await api.content.reject(id);
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
    [queryClient],
  );

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
            disabled={assembling}
            className="cursor-pointer flex items-center gap-2 rounded-lg border border-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)] hover:text-white disabled:opacity-50"
          >
            <FileText size={16} />
            {t("digest.assembleEdition")}
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
            <div className="flex items-start justify-between">
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
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${
                      item.status === "approved"
                        ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]"
                        : item.status === "rejected"
                          ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                          : "bg-white/10 text-[var(--color-text-muted)]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            </div>

            {item.status === "draft" && (
              <div className="mt-3 flex gap-2 border-t border-[var(--color-border)]/10 pt-3">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="cursor-pointer flex items-center gap-1 rounded-lg bg-[var(--color-accent-success)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
                >
                  <Check size={14} />
                  {t("library.approve")}
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="cursor-pointer flex items-center gap-1 rounded-lg bg-[var(--color-accent-danger)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
                >
                  <X size={14} />
                  {t("library.reject")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
