import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Copy } from "lucide-react";

export function StageSection({
  label,
  children,
  defaultCollapsed,
}: {
  label: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const isCollapsible = defaultCollapsed !== undefined;
  return (
    <div className="mb-4">
      <div
        className={`mb-2.5 flex items-center gap-3 ${isCollapsible ? "cursor-pointer select-none" : ""}`}
        onClick={() => isCollapsible && setCollapsed(!collapsed)}
      >
        {isCollapsible && (
          <ChevronDown
            size={11}
            className={`shrink-0 text-[var(--color-text-muted)]/50 transition-transform duration-[var(--duration-fast)] ${collapsed ? "-rotate-90" : ""}`}
          />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]/80">{label}</span>
        <div className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-white/[0.08] to-transparent" />
      </div>
      {!collapsed && children}
    </div>
  );
}

export function AvailableArticles({
  availableArticles,
  onAddArticle,
}: {
  availableArticles: { id: string; title: string | null }[];
  onAddArticle: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <StageSection label={`${t("newsletters.availableArticles")}${availableArticles.length > 0 ? ` (${availableArticles.length})` : ""}`}>
      {availableArticles.length > 0 ? (
        <div className="max-h-40 w-full space-y-1 overflow-y-auto">
          {availableArticles.map((c) => (
            <div
              key={c.id}
              className="flex w-full items-center justify-between rounded-md bg-white/[0.02] px-2.5 py-1.5 transition-colors hover:bg-white/[0.06]"
            >
              <span className="min-w-0 truncate text-xs text-[var(--color-bg-surface)]/70">
                {c.title || t("newsletters.noTitle")}
              </span>
              <button
                onClick={() => onAddArticle(c.id)}
                className="ml-1 shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)]/20"
              >
                {t("editor.add")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">{t("newsletters.noContentAvailable")}</p>
      )}
    </StageSection>
  );
}

export function CopyButton({ getContent, label }: { getContent: () => string; label: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }, [getContent]);

  return (
    <button
      onClick={handleCopy}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)]/10 px-3 py-1.5 text-[11px] text-[var(--color-bg-surface)]/80 transition-all hover:bg-white/10 hover:text-[var(--color-bg-surface)] active:scale-[0.97]"
    >
      <Copy size={12} />
      {copied ? t("newsletters.copied") : label}
    </button>
  );
}
