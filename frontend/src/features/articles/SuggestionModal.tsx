import { useTranslation } from "react-i18next";
import type { AITextSuggestion } from "../../api/types";

interface SuggestionModalProps {
  suggestion: AITextSuggestion;
  contentChanged: boolean;
  onReject: () => void;
  onApply: () => void;
}

export function SuggestionModal({ suggestion, contentChanged, onReject, onApply }: SuggestionModalProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-8 pb-8">
      <div className="mx-4 w-full max-w-2xl rounded-lg border border-[var(--tt-border-color-tint)] bg-[var(--color-bg-base)] shadow-lg">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[var(--tt-border-color-tint)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t("articles.improve_with_ai")}
          </h3>
          <button onClick={onReject} className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--tt-gray-dark-a-100)] hover:text-[var(--color-text-primary)] transition-colors" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {contentChanged && (
          <div className="rounded bg-[var(--color-accent-danger)]/10 p-3 text-sm text-[var(--color-accent-danger)]">
            {t("articles.content_changed")}
          </div>
        )}

        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                {t("articles.original")}
              </p>
              <div className="rounded-lg border border-[var(--tt-border-color-tint)] bg-[var(--tt-card-bg-color)] p-3.5 text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                {suggestion.original}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--tt-brand-color-500)] uppercase tracking-wider">
                {t("articles.suggested")}
              </p>
              <div className="rounded-lg border border-[var(--tt-brand-color-500)]/25 bg-[var(--tt-brand-color-500)]/[0.04] p-3.5 text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                {suggestion.suggestion}
              </div>
            </div>
          </div>

          {suggestion.explanation && (
            <div className="rounded-lg border border-[var(--tt-border-color-tint)] bg-[var(--tt-card-bg-color)] p-3.5 space-y-1.5">
              <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                {t("articles.why_label")}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {suggestion.explanation}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[var(--tt-border-color-tint)] bg-[var(--color-bg-base)] rounded-b-lg">
          <button
            onClick={onReject}
            className="rounded-lg border border-[var(--tt-border-color-tint)] px-3.5 py-1.5 text-sm text-[var(--color-text-tertiary)] hover:bg-[var(--tt-gray-dark-a-100)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {t("articles.reject_suggestion")}
          </button>
          <button
            onClick={onApply}
            disabled={contentChanged}
            className="rounded-lg bg-[var(--tt-brand-color-500)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {t("articles.apply_suggestion")}
          </button>
        </div>
      </div>
    </div>
  );
}
