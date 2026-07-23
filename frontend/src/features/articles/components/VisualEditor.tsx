import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TiptapEditor } from "../../../components/editor/TiptapEditor";
import { markdownToHtml } from "../../../lib/markdown";

interface VisualEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  body: string; // Markdown
  onBodyHtmlChange: (html: string) => void;
  onSelectionChange?: (text: string, from: number, to: number) => void;
  editorKey?: string;
  toolbarRight?: React.ReactNode;
  showToolbar?: boolean;
  statusBadge?: React.ReactNode;
  children?: React.ReactNode;
}

export function VisualEditor({
  title,
  onTitleChange,
  body,
  onBodyHtmlChange,
  onSelectionChange,
  editorKey,
  toolbarRight,
  showToolbar = true,
  statusBadge,
  children,
}: VisualEditorProps) {
  const { t } = useTranslation();
  // Convert Markdown → HTML for Tiptap on initial render / content change
  const htmlContent = useMemo(() => markdownToHtml(body), [body, editorKey]);

  return (
    <div className="flex h-full flex-col">
      <TiptapEditor
        key={editorKey}
        content={htmlContent}
        onUpdate={onBodyHtmlChange}
        onSelectionChange={onSelectionChange}
        className="flex min-h-0 flex-1 flex-col"
        toolbarRight={showToolbar ? toolbarRight : undefined}
      >
        {/* Title inside editor (same as newsletter) */}
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5 px-4 pt-6 pb-2">
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={t("articles.titlePlaceholder", "Untitled")}
            maxLength={200}
            aria-label={t("articles.titlePlaceholder", "Title")}
            className="w-full overflow-hidden border-0 bg-transparent px-0 text-3xl font-[var(--font-display)] leading-tight tracking-tight text-[var(--color-bg-surface)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none"
            style={{ textWrap: "balance" }}
          />
          {statusBadge && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded text-[11px] font-medium px-1.5 py-0.5 text-[var(--color-text-muted)]">
                {statusBadge}
              </span>
            </div>
          )}
        </div>
        {children}
      </TiptapEditor>
    </div>
  );
}
