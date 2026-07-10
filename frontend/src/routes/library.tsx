import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ContentItem } from "../api/client";

export function LibraryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
    select: (data) => data.filter((c) => c.product === "compose" || c.product === "newsletter"),
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

  if (selectedItem) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          onClick={() => setSelectedItem(null)}
          className="cursor-pointer flex items-center gap-1 text-sm text-[var(--color-accent-primary)] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to library
        </button>
        <input
          defaultValue={selectedItem.title ?? ""}
          className="w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 text-lg font-[var(--font-display)] text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
        />
        <textarea
          defaultValue={selectedItem.body_markdown ?? ""}
          className="h-96 w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4 text-sm leading-relaxed text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
        />
        <div className="flex gap-2">
          <span
            className={`inline-block rounded px-2 py-1 text-xs font-medium ${
              selectedItem.status === "approved"
                ? "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]"
                : selectedItem.status === "rejected"
                  ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                  : "bg-white/10 text-[var(--color-text-muted)]"
            }`}
          >
            {statusLabel(selectedItem.status)}
          </span>
          {selectedItem.status === "draft" && (
            <>
              <button
                onClick={async () => { await handleApprove(selectedItem.id); setSelectedItem(null); }}
                className="cursor-pointer flex items-center gap-1 rounded-lg bg-[var(--color-accent-success)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
              >
                <Check size={14} />
                {t("library.approve")}
              </button>
              <button
                onClick={async () => { await handleReject(selectedItem.id); setSelectedItem(null); }}
                className="cursor-pointer flex items-center gap-1 rounded-lg bg-[var(--color-accent-danger)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
              >
                <X size={14} />
                {t("library.reject")}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

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
            onClick={() => setSelectedItem(item)}
            className="cursor-pointer flex items-start justify-between rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4 transition-colors hover:border-[var(--color-accent-primary)]"
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
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
