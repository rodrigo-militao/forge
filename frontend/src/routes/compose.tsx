import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function ComposePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: content } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
  });

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await api.compose.generateTopic();
      await new Promise((r) => setTimeout(r, 2000));
      queryClient.invalidateQueries({ queryKey: ["content"] });
    } catch {
      // toast handled by UI
    } finally {
      setGenerating(false);
    }
  }, [queryClient]);

  const items = content?.filter((c) => c.product === "compose") ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[var(--font-display)] text-2xl">{t("compose.title")}</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Sparkles size={16} />
          {generating ? t("digest.running") : t("compose.generateTopic")}
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">{t("compose.noTopics")}</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-[var(--color-border)]/20 bg-white/5 p-4"
          >
            <h3 className="font-medium text-[var(--color-bg-surface)]">{item.title ?? "Untitled"}</h3>
            {item.body_markdown && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.body_markdown}</p>
            )}
            <span className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
