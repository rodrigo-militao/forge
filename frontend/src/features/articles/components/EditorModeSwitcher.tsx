import type { EditorMode } from "../hooks/use-article-editor";

interface EditorModeSwitcherProps {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}

const modes: { value: EditorMode; label: string }[] = [
  { value: "visual", label: "Visual" },
  { value: "markdown", label: "Markdown" },
  { value: "split", label: "Split" },
  { value: "preview", label: "Preview" },
];

export function EditorModeSwitcher({ mode, onChange }: EditorModeSwitcherProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Editor mode"
      className="inline-flex items-center gap-1"
    >
      {modes.map((m) => (
        <button
          key={m.value}
          role="radio"
          aria-checked={mode === m.value}
          onClick={() => onChange(m.value)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer ${
            mode === m.value
              ? "bg-[var(--color-accent-primary)] text-white"
              : "bg-white/10 text-[var(--color-text-muted)] hover:bg-white/[0.15] hover:text-[var(--color-bg-surface)]"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
