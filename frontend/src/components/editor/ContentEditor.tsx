import { TiptapEditor } from "./TiptapEditor";

interface ContentEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  subtitle?: string;
  onSubtitleChange?: (subtitle: string) => void;
  body: string;
  onBodyChange: (html: string) => void;
  editorKey?: string;
  titlePlaceholder?: string;
  subtitlePlaceholder?: string;
  toolbarRight?: React.ReactNode;
  children?: React.ReactNode;
}

export function ContentEditor({
  title,
  onTitleChange,
  subtitle = "",
  onSubtitleChange,
  body,
  onBodyChange,
  editorKey,
  titlePlaceholder = "Title",
  subtitlePlaceholder = "Subtitle",
  toolbarRight,
  children,
}: ContentEditorProps) {
  return (
    <div className="flex h-full flex-col">
      <TiptapEditor
        key={editorKey}
        content={body}
        onUpdate={onBodyChange}
        className="flex min-h-0 flex-1 flex-col"
        toolbarRight={toolbarRight}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5 px-4 pt-8 pb-4">
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={titlePlaceholder}
            maxLength={200}
            aria-label={titlePlaceholder}
            className="w-full overflow-hidden border-0 bg-transparent px-0 text-3xl font-[var(--font-display)] leading-tight tracking-tight text-[var(--color-bg-surface)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none"
          />
          {onSubtitleChange && (
            <input
              value={subtitle}
              onChange={(e) => onSubtitleChange(e.target.value)}
              placeholder={subtitlePlaceholder}
              maxLength={300}
              aria-label={subtitlePlaceholder}
              className="w-full border-0 bg-transparent px-0 text-base leading-normal text-[var(--color-text-muted)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none"
            />
          )}
        </div>
      </TiptapEditor>

      {children}
    </div>
  );
}
