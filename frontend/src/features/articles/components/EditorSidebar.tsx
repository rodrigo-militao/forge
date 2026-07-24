import { useTranslation } from "react-i18next";
import { Sparkles, BookOpen, ListTree, BarChart3 } from "lucide-react";
import type { AIAnalysisResult } from "../../../api/client";
import type { Reference } from "../../../api/types";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { OutlinePanel } from "./OutlinePanel";
import { DocumentStatsPanel } from "./DocumentStatsPanel";
import { ReferenceList, AttachReferenceModal } from "../../../components/references";
import type { OutlineItem } from "../hooks/use-outline";
import type { DocumentStats } from "../hooks/use-document-stats";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EditorMode } from "../hooks/use-article-editor";
import { useOutsideClick } from "../../../hooks/useOutsideClick";

interface EditorSidebarProps {
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  outlineItems: OutlineItem[];
  onOutlineNavigate?: (slug: string) => void;
  stats: DocumentStats & { references: number };
  analyzing: boolean;
  analysisError: string | null;
  persistedAnalysis: AIAnalysisResult | undefined;
  articleChangedSinceAnalysis: boolean;
  handleAnalyze: () => void;
  improving: boolean;
  improveError: string | null;
  selection: { text: string; from: number; to: number } | null;
  fallbackText: string;
  setFallbackText: (text: string) => void;
  handleFallbackImprove: () => void;
  contentChanged: boolean;
  articleRefs: Reference[];
  showAttachRef: boolean;
  setShowAttachRef: (v: boolean) => void;
  handleAttachRef: (refId: string) => void;
  handleDetachRef: (refId: string) => void;
}

export function EditorSidebar({
  editorMode,
  setEditorMode,
  outlineItems,
  onOutlineNavigate,
  stats,
  analyzing,
  analysisError,
  persistedAnalysis,
  articleChangedSinceAnalysis,
  handleAnalyze,
  improving,
  improveError,
  selection,
  fallbackText,
  setFallbackText,
  handleFallbackImprove,
  contentChanged,
  articleRefs,
  showAttachRef,
  setShowAttachRef,
  handleAttachRef,
  handleDetachRef,
}: EditorSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="hidden md:block h-full shrink-0 border-l border-[var(--color-border)]/10 overflow-y-auto bg-[var(--color-bg-surface-elevated)]">
      {/* Mode selector */}
      <div className="p-2.5 pb-3 border-b border-[var(--color-border)]/10">
        <span className="text-[11px] font-medium text-[var(--color-text-muted)] block mb-1.5">
          {t("articles.editor_mode", "Editor mode")}
        </span>
        <ModeDropdown
          value={editorMode}
          onChange={setEditorMode}
          options={[
            { value: "visual", label: "Visual" },
            { value: "markdown", label: "Markdown" },
            { value: "split", label: "Split" },
            { value: "preview", label: "Preview" },
          ]}
        />
      </div>

      {/* Content sections with minimal dividers */}
      <div className="divide-y divide-[var(--color-border)]/10">
        <div className="p-2.5">
          <CollapsiblePanel title={t("articles.outline", "Outline")} icon={<ListTree size={14} />} defaultOpen={true}>
            <OutlinePanel items={outlineItems} onNavigate={onOutlineNavigate} />
          </CollapsiblePanel>
        </div>

        <div className="p-2.5">
          <CollapsiblePanel title={t("articles.editorial_assistance")} icon={<Sparkles size={14} />} defaultOpen={true}>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full rounded-md px-3 py-1.5 text-xs font-medium bg-white/5 text-[var(--color-text-muted)] hover:bg-white/[0.12] hover:text-[var(--color-bg-surface)] disabled:opacity-50 transition-colors"
            >
              {analyzing ? t("articles.analyzing") : t("articles.analyze_article")}
            </button>

            {analysisError && (
              <p className="text-xs text-[var(--color-accent-danger)]">{analysisError}</p>
            )}
            {analyzing && <p className="text-xs text-[var(--color-text-muted)] italic">{t("articles.analyzing")}</p>}

            {persistedAnalysis && !articleChangedSinceAnalysis && (
              <details className="group text-xs" open>
                <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-bg-surface)]">
                  {t("articles.analysis")} · {persistedAnalysis.score}/100
                </summary>
                <div className="mt-2 space-y-2">
                  <p className="text-[var(--color-text-primary)]">{persistedAnalysis.summary}</p>
                  {persistedAnalysis.strengths.length > 0 && (
                    <div>
                      <p className="font-medium text-[var(--color-accent-success)]">{t("articles.strengths")}</p>
                      <ul className="list-disc list-inside text-[var(--color-text-secondary)]">
                        {persistedAnalysis.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {persistedAnalysis.improvements.length > 0 && (
                    <div>
                      <p className="font-medium text-[var(--color-accent-warning)]">{t("articles.improvements")}</p>
                      <ul className="list-disc list-inside text-[var(--color-text-secondary)]">
                        {persistedAnalysis.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="text-[var(--color-text-muted)]">
                    {t("articles.last_analyzed", { time: new Date(persistedAnalysis.created_at).toLocaleString() })}
                  </p>
                </div>
              </details>
            )}

            {persistedAnalysis && articleChangedSinceAnalysis && (
              <div className="space-y-2 text-xs">
                <p className="text-xs text-[var(--color-accent-warning)]">{t("articles.article_changed_since_analysis")}</p>
                <button onClick={handleAnalyze} disabled={analyzing} className="w-full rounded-md px-3 py-1.5 text-xs font-medium bg-white/5 text-[var(--color-text-muted)] hover:bg-white/[0.12] hover:text-[var(--color-bg-surface)] disabled:opacity-50 transition-colors">
                  {t("articles.analyze_article")}
                </button>
              </div>
            )}

            {!persistedAnalysis && !analyzing && (
              <p className="text-xs text-[var(--color-text-muted)]">{t("articles.analysis_unavailable")}</p>
            )}

            {!selection && (
              <>
                <hr className="border-[var(--color-border)]/10 my-2" />
                <details className="group text-xs">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-bg-surface)]">
                    {t("articles.improve_text")}
                  </summary>
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={fallbackText}
                      onChange={(e) => setFallbackText(e.target.value)}
                      placeholder={t("articles.select_text_to_improve")}
                      rows={2}
                      className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-2 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] resize-none"
                    />
                    <button
                      onClick={handleFallbackImprove}
                      disabled={improving || !fallbackText.trim()}
                      className="w-full rounded-md px-3 py-1.5 text-xs font-medium bg-white/5 text-[var(--color-text-muted)] hover:bg-white/[0.12] hover:text-[var(--color-bg-surface)] disabled:opacity-50 transition-colors"
                    >
                      {improving ? t("articles.improving") : t("articles.improve_with_ai")}
                    </button>
                    {improveError && !contentChanged && (
                      <p className="text-xs text-[var(--color-accent-danger)]">{improveError}</p>
                    )}
                    {contentChanged && (
                      <p className="text-xs text-[var(--color-accent-danger)]">{t("articles.content_changed")}</p>
                    )}
                  </div>
                </details>
              </>
            )}
          </CollapsiblePanel>
        </div>

        <div className="p-2.5">
          <CollapsiblePanel title={t("references.title")} icon={<BookOpen size={14} />} defaultOpen={true}>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowAttachRef(true)}
                className="text-xs font-medium text-[var(--color-accent-primary)] hover:underline transition-colors"
              >
                {t("references.add")}
              </button>
            </div>
            <ReferenceList references={articleRefs} onRemove={handleDetachRef} compact />
          </CollapsiblePanel>
        </div>

        <div className="p-2.5">
          <CollapsiblePanel title={t("articles.document_stats", "Document Stats")} icon={<BarChart3 size={14} />} defaultOpen={false}>
            <DocumentStatsPanel stats={stats} />
          </CollapsiblePanel>
        </div>
      </div>

      {showAttachRef && (
        <AttachReferenceModal
          existingReferences={articleRefs}
          onAttach={handleAttachRef}
          onDetach={handleDetachRef}
          onClose={() => setShowAttachRef(false)}
        />
      )}
    </aside>
  );
}

/* ───── System-consistent dropdown ───── */
interface ModeDropdownProps {
  value: string;
  onChange: (value: EditorMode) => void;
  options: { value: string; label: string }[];
}

function ModeDropdown({ value, onChange, options }: ModeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false), open);

  const currentLabel = options.find((o) => o.value === value)?.label ?? "";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-[var(--color-border)]/20 px-2.5 py-1.5 text-xs text-[var(--color-bg-surface)] transition-all hover:bg-white/5 active:scale-[0.92]"
      >
        <span className="capitalize">{currentLabel}</span>
        <ChevronDown size={13} className="shrink-0 text-[var(--color-text-muted)]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full animate-[scaleIn_150ms_ease-out] rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg-base)] p-1.5 shadow-2xl ring-1 ring-black/30">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value as EditorMode); setOpen(false); }}
              className={`flex w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                value === opt.value
                  ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                  : "text-[var(--color-bg-surface)] hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
