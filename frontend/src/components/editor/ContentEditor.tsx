import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { TiptapEditor } from "./TiptapEditor";
import { TagInput } from "../ui/tag-input";

interface ContentEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  body: string;
  onBodyChange: (html: string) => void;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  availableTags: string[];
  status: string;
  onStatusChange: (status: string) => void;
  editorKey?: string;
  titlePlaceholder?: string;
  onTransform?: (action: "expand" | "rewrite", editor: Editor) => void;
  isSynced?: boolean;
  isSaving?: boolean;
  saveError?: string | null;
  children?: React.ReactNode;
}

export function ContentEditor({
  title,
  onTitleChange,
  body,
  onBodyChange,
  tags,
  onAddTag,
  onRemoveTag,
  availableTags,
  status,
  onStatusChange,
  editorKey,
  titlePlaceholder = "Title",
  onTransform,
  isSynced = false,
  saveError = null,
  children,
}: ContentEditorProps) {
  const { t } = useTranslation();
  const unusedTags = availableTags.filter((t) => !tags.includes(t));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="relative">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={titlePlaceholder}
          maxLength={200}
          className="w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 pr-24 text-lg font-[var(--font-display)] text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
        />
        {/* Sync indicator — overlaid on the title bar */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {saveError ? (
            <span className="pointer-events-auto inline-flex items-center gap-1 rounded bg-[var(--color-accent-danger)]/10 px-2 py-0.5 text-xs text-[var(--color-accent-danger)]">
              <AlertCircle size={12} />
              {saveError}
            </span>
          ) : isSynced ? (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-accent-success)]">
              <CheckCircle2 size={12} />
              {t("editor.synced")}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">{t("editor.saving")}</span>
          )}
        </div>
      </div>

      <TiptapEditor
        key={editorKey}
        content={body}
        onUpdate={onBodyChange}
        className="min-h-[300px]"
        onTransform={onTransform}
      />

      {children}

      {/* Tags */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[var(--color-bg-surface)]">{t("editor.tags")}</label>
        {tags.length === 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">{t("editor.noTags")}</span>
        )}
        <TagInput tags={tags} onAdd={onAddTag} onRemove={onRemoveTag} />
        {unusedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">{t("editor.add")}</span>
            {unusedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onAddTag(tag)}
                className="cursor-pointer rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
              >
                + {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div>
        <label className="text-sm font-medium text-[var(--color-bg-surface)]">{t("editor.status")}</label>
        <div className="mt-1.5 flex gap-2">
          {(["draft", "published", "discarded"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                status === s
                  ? s === "published"
                    ? "bg-[var(--color-accent-primary)] text-white"
                    : s === "discarded"
                      ? "bg-[var(--color-accent-danger)]/20 text-[var(--color-accent-danger)]"
                      : "bg-white/10 text-[var(--color-bg-surface)]"
                  : "bg-white/[0.06] text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
              }`}
            >
              {t(`editor.${s}` as const)}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
