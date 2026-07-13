import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, CheckCircle2, AlertCircle } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { TiptapEditor } from "./TiptapEditor";

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
  isSaving = false,
  saveError = null,
  children,
}: ContentEditorProps) {
  const { t } = useTranslation();
  const unusedTags = availableTags.filter((t) => !tags.includes(t));
  const [newTag, setNewTag] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={titlePlaceholder}
        className="w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 text-lg font-[var(--font-display)] text-[var(--color-bg-surface)] focus:border-[var(--color-accent-primary)] focus:outline-none"
      />

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
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.length > 0 ? tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-primary)]/20 px-2.5 py-0.5 text-xs text-[var(--color-accent-primary)]">
              {tag}
              <button onClick={() => onRemoveTag(tag)} className="cursor-pointer hover:text-[var(--color-accent-danger)]">
                <X size={11} />
              </button>
            </span>
          )) : (
            <span className="text-xs text-[var(--color-text-muted)]">{t("editor.noTags")}</span>
          )}
        </div>
        {unusedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">Add</span>
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
        <div className="flex gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newTag.trim()) { onAddTag(newTag.trim()); setNewTag(""); } }}
            placeholder={t("editor.addTag")}
            className="flex-1 rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]"
          />
          <button
            onClick={() => { if (newTag.trim()) { onAddTag(newTag.trim()); setNewTag(""); } }}
            disabled={!newTag.trim()}
            className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>
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

      {/* Sync indicator — replaces manual save button */}
      <div className="flex items-center gap-2">
        {isSaving && (
          <span className="text-xs text-[var(--color-text-muted)]">{t("editor.saving")}</span>
        )}
        {isSynced && !isSaving && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-accent-success)]">
            <CheckCircle2 size={12} />
            Synced
          </span>
        )}
        {saveError && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-accent-danger)]">
            <AlertCircle size={12} />
            {saveError}
          </span>
        )}
      </div>
    </div>
  );
}
