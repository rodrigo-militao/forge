import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Plus } from "lucide-react";
import type { NewsletterEdition } from "../../../api/client";

interface NewsletterSelectorProps {
  top?: number;
  right?: number;
  newsletters: NewsletterEdition[];
  creating: boolean;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export const NewsletterSelector = forwardRef<HTMLDivElement, NewsletterSelectorProps>(
  ({ top, right, newsletters, creating, onSelect, onCreateNew }, ref) => {
    const { t } = useTranslation();
    return (
      <div
        ref={ref}
        className="fixed z-50 w-56 animate-[scaleIn_150ms_ease-out_forwards] origin-top-right rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg-base)] p-2 shadow-2xl ring-1 ring-black/30"
        style={{ top, right }}
      >
        <p className="px-2 py-1 text-xs font-medium text-[var(--color-text-muted)]">
          {t("digest.addToNewsletterLabel")}
        </p>
        {newsletters.length === 0 && (
          <p className="px-2 py-2 text-xs text-[var(--color-text-muted)]">
            {t("digest.noDraftNewsletters")}
          </p>
        )}
        {newsletters.map((nl) => (
          <button
            key={nl.id}
            onClick={() => onSelect(nl.id)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-bg-surface)] transition-colors hover:bg-white/10"
          >
            <Mail size={14} className="shrink-0 text-[var(--color-accent-primary)]" />
            <span className="truncate">{nl.title || t("digest.noTitle")}</span>
          </button>
        ))}
        <div className="mt-1 border-t border-[var(--color-border)]/10 pt-1">
          <button
            onClick={onCreateNew}
            disabled={creating}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/10 disabled:opacity-50"
          >
            <Plus size={14} />
            {creating ? t("digest.creatingNewsletter") : t("digest.createNewNewsletter")}
          </button>
        </div>
      </div>
    );
  },
);

NewsletterSelector.displayName = "NewsletterSelector";
