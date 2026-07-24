import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "../../api/client";
import { queryKeys } from "../../lib/queryKeys";
import type { Reference } from "../../api/types";

interface AttachReferenceModalProps {
  existingReferences: Reference[];
  onAttach: (referenceId: string) => Promise<void>;
  onDetach: (referenceId: string) => Promise<void>;
  onClose: () => void;
}

export function AttachReferenceModal({ existingReferences, onAttach, onDetach, onClose }: AttachReferenceModalProps) {
  const { t } = useTranslation();
  const existingIds = useMemo(() => new Set(existingReferences.map((r) => r.id)), [existingReferences]);

  const { data: allRefs, isLoading } = useQuery({
    queryKey: queryKeys.references.all,
    queryFn: () => api.references.list(),
  });

  const available = useMemo(
    () => (allRefs ?? []).filter((r) => !existingIds.has(r.id)),
    [allRefs, existingIds],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-[var(--color-surface-elevated)] p-6 shadow-lg">
        <h3 className="text-base font-medium text-[var(--color-text-primary)] mb-4">
          {t("references.select_reference")}
        </h3>

        {isLoading && (
          <p className="text-sm text-[var(--color-text-tertiary)]">{t("references.loading")}</p>
        )}

        {!isLoading && available.length === 0 && (
          <p className="text-sm text-[var(--color-text-tertiary)]">{t("references.empty")}</p>
        )}

        {!isLoading && available.length > 0 && (
          <div className="max-h-64 space-y-2 overflow-y-auto mb-4">
            {available.map((ref) => (
              <button
                key={ref.id}
                onClick={() => onAttach(ref.id)}
                className="w-full cursor-pointer rounded-lg border border-[var(--color-border)]/10 p-3 text-left transition-colors hover:bg-[var(--color-bg-muted)]/10"
              >
                <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {ref.title || ref.url}
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 truncate">
                  {ref.url} · <span className="uppercase">{t(`references.types.${ref.reference_type}`)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-muted)]/10"
          >
            {t("references.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
