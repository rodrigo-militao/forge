import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function LibraryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
    select: (data) => data.filter((c) => c.product === "compose"),
  });

  const handleApprove = useCallback(
    async (id: string) => {
      await api.content.approve(id);
      queryClient.invalidateQueries({ queryKey: ["content"] });
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

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: t("library.draft"),
      approved: t("library.approved"),
      rejected: t("library.rejected"),
    };
    return map[status] ?? status;
  };

  if (isLoading) return <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-[var(--font-display)] text-2xl">{t("library.title")}</h1>

      <div className="space-y-3">
        {!content?.length && (
          <p className="text-sm text-[var(--color-text-muted)]">{t("library.empty")}</p>
        )}
        {content?.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4"
          >
            <div className="flex-1">
              <h3 className="font-medium text-[var(--color-bg-surface)]">
                {item.title || "(no title)"}
              </h3>
              <span
                className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
                  item.status === "approved"
                    ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]"
                    : item.status === "rejected"
                      ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                      : "bg-white/10 text-[var(--color-text-muted)]"
                }`}
              >
                {statusLabel(item.status)}
              </span>
            </div>
            {item.status === "draft" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="cursor-pointer rounded-lg bg-[var(--color-accent-success)] p-2 text-white transition-opacity hover:opacity-80"
                  title={t("library.approve")}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="cursor-pointer rounded-lg bg-[var(--color-accent-danger)] p-2 text-white transition-opacity hover:opacity-80"
                  title={t("library.reject")}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
