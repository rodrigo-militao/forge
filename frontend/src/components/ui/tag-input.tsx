import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Tag management: displays existing tags as removable pills and
 * provides an input to add new tags.
 */
export function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
  disabled,
}: TagInputProps) {
  const { t } = useTranslation();
  const [newTag, setNewTag] = useState("");

  const handleAdd = () => {
    const tag = newTag.trim();
    if (!tag) return;
    onAdd(tag);
    setNewTag("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.length > 0
          ? tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-primary)]/20 px-2.5 py-0.5 text-xs text-[var(--color-accent-primary)]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onRemove(tag)}
                  className="cursor-pointer hover:text-[var(--color-accent-danger)]"
                  disabled={disabled}
                >
                  <X size={11} />
                </button>
              </span>
            ))
          : null}
      </div>
      <div className="flex gap-2">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder ?? t("editor.addTag")}
          maxLength={50}
          disabled={disabled}
          className="flex-1 rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newTag.trim() || disabled}
          className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
