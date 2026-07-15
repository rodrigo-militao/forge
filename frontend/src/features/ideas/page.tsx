import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";

export function IdeasPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full bg-[var(--color-surface-elevated)] p-4">
        <Lightbulb size={32} className="text-[var(--color-accent-primary)]" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-[var(--color-bg-surface)]">
        {t("ideas.title")}
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        {t("ideas.emptyDesc")}
      </p>
    </div>
  );
}
