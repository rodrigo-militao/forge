import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Eye, EyeOff, FileText, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { api } from "../../api/client";
import { useJobPolling } from "../../hooks/useJobPolling";

export function DigestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [showUsedInEdition, setShowUsedInEdition] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [addingTag, setAddingTag] = useState<string | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ["content"],
    queryFn: api.content.list,
  });

  const { data: usedIDs } = useQuery({
    queryKey: ["used-content-ids"],
    queryFn: api.digest.usedContentIDs,
  });

  const { data: availableTags } = useQuery({
    queryKey: ["tags"],
    queryFn: api.content.listTags,
  });

  const usedSet = new Set(usedIDs ?? []);
  const items =
    content?.filter(
      (c) =>
        c.product === "digest" &&
        c.deleted_at === null &&
        (showUsedInEdition || !usedSet.has(c.id)),
    ) ?? [];

  const categories = [...new Set(items.map((c) => c.category).filter(Boolean) as string[])];
  let filteredItems = categoryFilter
    ? items.filter((c) => c.category === categoryFilter)
    : items;
  if (tagFilter) {
    filteredItems = filteredItems.filter((c) => (c.tags || []).includes(tagFilter));
  }

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
        queryClient.invalidateQueries({ queryKey: ["tags"] });
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
        queryClient.invalidateQueries({ queryKey: ["tags"] });
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

  const usedCount = items.filter((c) => usedSet.has(c.id)).length;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="skeleton skeleton-title" />
          <div className="flex gap-2">
            <div className="skeleton skeleton-card !mb-0 !h-9 w-20 rounded-lg" />
            <div className="skeleton skeleton-card !mb-0 !h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <div className="skeleton skeleton-text !w-16 rounded-full" />
          <div className="skeleton skeleton-text !w-20 rounded-full" />
          <div className="skeleton skeleton-text !w-14 rounded-full" />
        </div>
        <div className="mt-5 space-y-3">
          <div className="skeleton skeleton-card rounded-lg" />
          <div className="skeleton skeleton-card rounded-lg" />
          <div className="skeleton skeleton-card rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-[var(--font-display)] text-2xl">
          {t("digest.title")}
          {items.length > 0 && (
            <span className="ml-2 align-baseline font-[var(--font-body)] text-base font-normal text-[var(--color-text-muted)]">
              {items.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["content"] })}
            className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 p-2 text-[var(--color-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-bg-surface)]"
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

      {/* Filter toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
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
        {availableTags && availableTags.length > 0 && (
          <>
            <span className="h-4 w-px bg-white/10" />
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setTagFilter("")}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  !tagFilter
                    ? "bg-[var(--color-accent-primary)] text-white"
                    : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
                }`}
              >
                {t("digest.tagFilter")}
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    tagFilter === tag
                      ? "bg-[var(--color-accent-primary)] text-white"
                      : "bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-bg-surface)]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </>
        )}
        <span className="h-4 w-px bg-white/10" />
        <button
          onClick={() => setShowUsedInEdition((prev) => !prev)}
          className={`cursor-pointer flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            showUsedInEdition
              ? "bg-white/10 text-[var(--color-bg-surface)]"
              : "bg-white/[0.06] text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
          }`}
        >
          {showUsedInEdition ? <Eye size={14} /> : <EyeOff size={14} />}
          {t("digest.showUsedInEdition")}
          {usedCount > 0 && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">{usedCount}</span>
          )}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {filteredItems.length === 0 && !running && (
          <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
            <svg
              width="128"
              height="96"
              viewBox="0 0 128 96"
              fill="none"
              className="mb-6 text-[var(--color-accent-primary)]"
              aria-hidden="true"
            >
              <rect x="8" y="32" width="112" height="32" rx="6" stroke="currentColor" strokeWidth="1" opacity="0.15" />
              <circle cx="28" cy="48" r="3" fill="currentColor" opacity="0.3" />
              <circle cx="44" cy="48" r="3" fill="currentColor" opacity="0.5" />
              <circle cx="60" cy="48" r="3" fill="currentColor" opacity="0.7" />
              <circle cx="100" cy="48" r="8" fill="currentColor" />
              <circle cx="100" cy="48" r="3" fill="var(--color-bg-base)" />
              <path d="M72 28 Q90 20 100 40" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" />
              <path d="M72 68 Q90 76 100 56" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" />
            </svg>
            <h2 className="font-[var(--font-display)] text-xl text-[var(--color-bg-surface)]">
              {t("digest.emptyTitle")}
            </h2>
            <p className="mt-2 max-w-md text-center text-sm text-[var(--color-text-secondary)]">
              {t("digest.emptyDesc")}
            </p>
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleRun}
                className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:translate-y-px"
              >
                <Sparkles size={16} />
                {t("digest.run")}
              </button>
              <button
                onClick={() => navigate({ to: "/settings" })}
                className="cursor-pointer text-sm text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-bg-surface)] hover:underline"
              >
                {t("digest.configureSources")}
              </button>
            </div>
          </div>
        )}
        {running && filteredItems.length === 0 && (
          <div className="flex flex-col items-center py-12 opacity-0 animate-[fadeIn_400ms_ease-out_forwards]">
            <div className="mb-6 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary)] animate-pulse [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary)] animate-pulse [animation-delay:300ms]" />
            </div>
            <p className="text-sm text-[var(--color-accent-primary)]">
              Processing articles…
            </p>
          </div>
        )}
        {filteredItems.map((item, idx) => {
          const isUsed = usedSet.has(item.id);
          return (
          <div
            key={item.id}
            style={!isUsed ? { animationDelay: `${idx * 50}ms` } : undefined}
            className={`rounded-lg border border-[var(--color-border)]/20 p-3.5 transition-all duration-200 ${
              isUsed
                ? "bg-white/[0.03] opacity-60"
                : "animate-[fadeIn_400ms_ease-out_forwards] bg-white/5 opacity-0 hover:bg-white/[0.08]"
            } ${
              selectedIDs.has(item.id) ? "ring-1 ring-[var(--color-accent-primary)]" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                onClick={() => toggleSelected(item.id)}
                className={`mt-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-150 ${
                  selectedIDs.has(item.id)
                    ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]"
                    : "border-white/15 bg-transparent hover:border-white/30"
                }`}
              >
                {selectedIDs.has(item.id) && (
                  <Check size={14} className="text-white" />
                )}
              </button>
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
                  {isUsed && (
                    <span className="rounded bg-[var(--color-accent-success)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-accent-success)]">
                      Used
                    </span>
                  )}
                </div>
                {item.body_markdown && (
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {item.body_markdown}
                  </p>
                )}
                <div className="mt-2.5">
                  {editingCategory === item.id ? (
                    <input
                      ref={categoryInputRef}
                      defaultValue={item.category ?? ""}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCategoryKeyDown(e, item.id);
                          setEditingCategory(null);
                        }
                        if (e.key === "Escape") setEditingCategory(null);
                      }}
                      onBlur={() => setEditingCategory(null)}
                      placeholder={t("digest.categoryPlaceholder")}
                      className="w-40 rounded-md border border-[var(--color-border)]/10 bg-white/5 px-2 py-1 text-xs text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
                      autoFocus
                    />
                  ) : item.category ? (
                    <button
                      onClick={() => setEditingCategory(item.id)}
                      className="cursor-pointer rounded-full bg-[var(--color-accent-primary)]/20 px-3 py-1 text-xs font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/30"
                    >
                      {item.category}
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingCategory(item.id)}
                      className="cursor-pointer rounded-full bg-white/[0.06] px-3 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
                    >
                      + {t("digest.categoryPlaceholder")}
                    </button>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]"
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
                  {addingTag === item.id ? (
                    <div className="inline-flex items-center gap-0.5">
                      <input
                        ref={tagInputRef}
                        value={tagInput[item.id] ?? ""}
                        onChange={(e) =>
                          setTagInput((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag(item.id);
                          }
                          if (e.key === "Escape") {
                            setAddingTag(null);
                            setTagInput((prev) => ({ ...prev, [item.id]: "" }));
                          }
                        }}
                        onBlur={() => {
                          if (!tagInput[item.id]?.trim()) setAddingTag(null);
                        }}
                        placeholder={t("digest.tagPlaceholder")}
                        className="w-28 rounded-md border border-[var(--color-border)]/10 bg-white/5 px-2 py-1 text-xs text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTag(item.id)}
                      className="cursor-pointer inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
                    >
                      <Plus size={12} />
                      {t("digest.tagPlaceholder")}
                    </button>
                  )}
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
          );
        })}
      </div>
    </div>
  );
}
