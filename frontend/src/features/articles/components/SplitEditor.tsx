import Markdown from "react-markdown";
import { MarkdownEditor } from "./MarkdownEditor";

interface SplitEditorProps {
  markdown: string;
  onMarkdownChange: (md: string) => void;
  onSelectionChange?: (text: string, from: number, to: number) => void;
}

export function SplitEditor({ markdown, onMarkdownChange, onSelectionChange }: SplitEditorProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-row">
      {/* Left: Markdown editor */}
      <div className="flex w-1/2 min-w-0 flex-col overflow-hidden border-r border-[var(--color-border)]/10">
        <div className="shrink-0 border-b border-[var(--color-border)]/10 px-3 py-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Markdown</span>
        </div>
        <MarkdownEditor
          value={markdown}
          onChange={onMarkdownChange}
          onSelectionChange={onSelectionChange}
        />
      </div>

      {/* Right: Rendered preview */}
      <div className="flex w-1/2 min-w-0 flex-col">
        <div className="shrink-0 border-b border-[var(--color-border)]/10 px-3 py-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Preview</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="prose-styles text-[var(--color-bg-surface)]">
            <Markdown>{markdown}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}
