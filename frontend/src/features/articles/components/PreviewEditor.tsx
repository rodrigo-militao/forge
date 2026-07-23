import Markdown from "react-markdown";

interface PreviewEditorProps {
  markdown: string;
}

export function PreviewEditor({ markdown }: PreviewEditorProps) {
  if (!markdown.trim()) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Nothing to preview yet. Start writing in Visual or Markdown mode.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="prose-styles mx-auto w-full max-w-3xl px-6 py-10">
        <article className="text-[var(--color-bg-surface)]">
          <Markdown>{markdown}</Markdown>
        </article>
      </div>
    </div>
  );
}
