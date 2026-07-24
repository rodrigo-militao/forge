import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

import { api } from "../../api/client";
import { queryKeys } from "../../lib/queryKeys";
import type { Reference, ReferenceType } from "../../api/types";

const REFERENCE_TYPES: ReferenceType[] = [
  "article", "video", "podcast", "social_post", "document", "website", "other",
];

// ============================================================================
// References Management Page
// ============================================================================

export function ReferencesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingRef, setEditingRef] = useState<Reference | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: refs, isLoading, error } = useQuery({
    queryKey: queryKeys.references.all,
    queryFn: () => api.references.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.references.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.references.all }),
  });

  const handleEdit = useCallback((ref: Reference) => {
    setEditingRef(ref);
    setShowForm(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingRef(null);
    setShowForm(true);
  }, []);

  const handleFormDone = useCallback(() => {
    setShowForm(false);
    setEditingRef(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      await deleteMut.mutateAsync(id);
    } finally {
      setDeleting(null);
    }
  }, [deleteMut]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="text-center text-sm text-[var(--color-text-tertiary)]">{t("references.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="rounded-lg border border-[var(--color-accent-danger)]/30 bg-[var(--color-accent-danger)]/10 p-4 text-center text-sm text-[var(--color-accent-danger)]">
          {t("references.error_load")}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{t("references.title")}</h1>
        <button
          onClick={handleNew}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          <Plus size={16} /> {t("references.create")}
        </button>
      </div>

      {showForm && (
        <ReferenceForm
          existing={editingRef}
          onDone={handleFormDone}
        />
      )}

      {!refs || refs.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-surface-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-tertiary)]">{t("references.empty")}</p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{t("references.create_first")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {refs.map((ref) => (
            <div
              key={ref.id}
              className="rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-surface-elevated)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-primary)] hover:underline"
                  >
                    {ref.title || ref.url} <ExternalLink size={12} />
                  </a>
                  {ref.description && (
                    <p className="text-xs text-[var(--color-text-tertiary)]">{ref.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                    {ref.source_name && <span>{ref.source_name}</span>}
                    <span className="rounded bg-[var(--color-bg-muted)]/10 px-1.5 py-0.5 uppercase">
                      {t(`references.types.${ref.reference_type}`)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(ref)}
                    className="cursor-pointer rounded p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-muted)]/10 hover:text-[var(--color-text-primary)]"
                    title={t("references.edit")}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(ref.id)}
                    disabled={deleting === ref.id}
                    className="cursor-pointer rounded p-1.5 text-[var(--color-accent-danger)] transition-colors hover:bg-[var(--color-accent-danger)]/10"
                    title={t("references.delete")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Reference Form (create + edit)
// ============================================================================

interface ReferenceFormProps {
  existing?: Reference | null;
  onDone: () => void;
}

function ReferenceForm({ existing, onDone }: ReferenceFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditing = !!existing;

  const [url, setUrl] = useState(existing?.url ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [sourceName, setSourceName] = useState(existing?.source_name ?? "");
  const [refType, setRefType] = useState<ReferenceType>(existing?.reference_type ?? "website");
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      api.references.create({
        url,
        title: title || null,
        description: description || null,
        source_name: sourceName || null,
        reference_type: refType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.references.all });
      onDone();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      api.references.update(existing!.id, {
        url: url || undefined,
        title: title || null,
        description: description || null,
        source_name: sourceName || null,
        reference_type: refType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.references.all });
      onDone();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("URL is required");
      return;
    }
    if (isEditing) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-surface-elevated)] p-4 space-y-4"
    >
      {error && (
        <div className="rounded bg-[var(--color-accent-danger)]/10 px-3 py-2 text-xs text-[var(--color-accent-danger)]">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
          {t("references.url")} *
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          required
          className="w-full rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
          {t("references.title_label")}
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
          {t("references.description")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] resize-none"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            {t("references.source_name")}
          </label>
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            {t("references.type")}
          </label>
          <select
            value={refType}
            onChange={(e) => setRefType(e.target.value as ReferenceType)}
            className="w-full rounded-lg border border-[var(--color-border)]/10 bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)] cursor-pointer"
          >
            {REFERENCE_TYPES.map((rt) => (
              <option key={rt} value={rt}>{t(`references.types.${rt}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-muted)]/10"
        >
          {t("references.cancel")}
        </button>
        <button
          type="submit"
          disabled={createMut.isPending || updateMut.isPending}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {isEditing ? t("references.save") : t("references.create")}
        </button>
      </div>
    </form>
  );
}

