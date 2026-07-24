import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import type { Reference } from "../../api/types";

interface ReferenceListProps {
  references: Reference[];
  onRemove?: (id: string) => void;
  compact?: boolean;
}

export function ReferenceList({ references, onRemove, compact }: ReferenceListProps) {
  const { t } = useTranslation();

  if (references.length === 0) {
    return (
      <p className="text-xs text-[var(--color-text-tertiary)]">
        {t("references.empty")}
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {references.map((ref) => (
        <div key={ref.id} className={`${compact ? "text-xs" : "text-sm"}`}>
          <div className="flex items-start justify-between gap-2">
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[var(--color-accent-primary)] hover:underline truncate"
            >
              {ref.title || ref.url} <ExternalLink size={compact ? 10 : 12} />
            </a>
            {onRemove && (
              <button
                onClick={() => onRemove(ref.id)}
                className="cursor-pointer shrink-0 text-[var(--color-accent-danger)] hover:underline text-xs"
              >
                {t("references.remove")}
              </button>
            )}
          </div>
          {ref.source_name && (
            <span className="text-[var(--color-text-tertiary)]">{ref.source_name}</span>
          )}
          {!compact && ref.description && (
            <p className="mt-0.5 text-[var(--color-text-tertiary)]">{ref.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
