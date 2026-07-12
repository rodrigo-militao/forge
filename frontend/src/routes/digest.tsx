import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { api } from "../api/client";
import { useJobPolling } from "../hooks/useJobPolling";

export function DigestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
  });

  const { data: usedIDs } = useQuery({
    queryKey: ["used-content-ids"],
    queryFn: api.digest.usedContentIDs,
  });

  const usedSet = new Set(usedIDs ?? []);
  const items =
    content?.filter(
      (c) =>
        c.product === "digest" && c.deleted_at === null && !usedSet.has(c.id),
    ) ?? [];

  const categories = [...new Set(items.map((c) => c.category).filter(Boolean) as string[])];
  const filteredItems = categoryFilter
    ? items.filter((c) => c.category === categoryFilter)
    : items;

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

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.content.delete(id);
        queryClient.invalidateQueries({ queryKey: ["content"] });
        setSelectedIDs((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success(t("digest.deleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [queryClient, t],
  );

  const handleAddTag = useCallback(
    async (id: string) => {
      const tag = tagInput[id]?.trim();
      if (!tag) return;
      try {
        await api.content.addTag(id, tag);
        queryClient.invalidateQueries({ queryKey: ["content"] });
        setTagInput((prev) => ({ ...prev, [id]: "" }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [queryClient, tagInput],
  );

  const handleRemoveTag = useCallback(
    async (id: string, tag: string) => {
      try {
        await api.content.removeTag(id, tag);
        queryClient.invalidateQueries({ queryKey: ["content"] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [queryClient],
  );

  const handleCategoryKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
      if (e.key === "Enter") {
        const val = (e.target as HTMLInputElement).value.trim();
        await api.content.updateCategory(id, val || null);
        queryClient.invalidateQueries({ queryKey: ["content"] });
      }
      if (e.key === "Escape") {
        (e.target as HTMLInputElement).blur();
      }
    },
    [queryClient],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddTag(id);
      }
    },
    [handleAddTag],
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
            disabled={selectedIDs.size === 0}
            className="cursor-pointer flex items-center gap-2 rounded-lg border border-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)] hover:text-white disabled:opacity-50"
          >
            <FileText size={16} />
            {t("digest.assembleEdition")} ({selectedIDs.size})
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategoryFilter("")}
          className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !categoryFilter
              ? "bg-[var(--color-accent-primary)] text-white"
              : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === cat
                ? "bg-[var(--color-accent-primary)] text-white"
                : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 && !running && (
          <p className="text-sm text-[var(--color-text-muted)]">{t("digest.noContent")}</p>
        )}
        {running && filteredItems.length === 0 && (
          <p className="text-sm text-[var(--color-accent-primary)] animate-pulse">
            Processing articles…
          </p>
        )}
        {filteredItems.map((item) => (
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium">
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
                </div>
                {item.body_markdown && (
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {item.body_markdown}
                  </p>
                )}
                {/* Category */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    defaultValue={item.category ?? ""}
                    onKeyDown={(e) => handleCategoryKeyDown(e, item.id)}
                    placeholder={t("digest.categoryPlaceholder")}
                    className="w-40 rounded-md border border-[var(--color-border)]/10 bg-white/5 px-2 py-0.5 text-xs text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
                  />
                  {item.category && (
                    <span className="rounded-full bg-[var(--color-accent-primary)]/20 px-2 py-0.5 text-xs text-[var(--color-accent-primary)]">
                      {item.category}
                    </span>
                  )}
                </div>
                {/* Tags */}
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 rounded bg-white/10 px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(item.id, tag)}
                        className="cursor-pointer hover:text-[var(--color-accent-danger)]"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-0.5">
                    <input
                      ref={tagInputRef}
                      value={tagInput[item.id] ?? ""}
                      onChange={(e) =>
                        setTagInput((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      onKeyDown={(e) => handleTagKeyDown(e, item.id)}
                      placeholder={t("digest.tagPlaceholder")}
                      className="w-20 rounded border border-[var(--color-border)]/10 bg-white/5 px-1.5 py-0.5 text-xs text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
                    />
                    {tagInput[item.id]?.trim() && (
                      <button
                        onClick={() => handleAddTag(item.id)}
                        className="cursor-pointer text-[var(--color-accent-primary)] hover:opacity-80"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="cursor-pointer rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-danger)]/20 hover:text-[var(--color-accent-danger)]"
                title={t("digest.delete")}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
