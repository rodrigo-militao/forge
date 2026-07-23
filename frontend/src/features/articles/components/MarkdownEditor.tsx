import { useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";

// Custom theme matching the Forge design system — transparent background
const forgeEditorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    height: "100%",
  },
  ".cm-editor": {
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    fontFamily: 'var(--font-mono, "JetBrains Mono", "SF Mono", monospace)',
    fontSize: "0.8125rem",
    lineHeight: "1.6",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "none",
    color: "rgba(140, 138, 134, 0.35)",
    fontSize: "0.75rem",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  ".cm-content": {
    caretColor: "var(--color-accent-primary, #c96b2c)",
    color: "var(--color-bg-surface, #f7f6f3)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--color-accent-primary, #c96b2c)",
    borderLeftWidth: "2px",
  },
  ".cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(201, 107, 44, 0.25)",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "rgba(201, 107, 44, 0.25)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

interface MarkdownEditorProps {
  value: string;
  onChange: (md: string) => void;
  onSelectionChange?: (text: string, from: number, to: number) => void;
}

export function MarkdownEditor({ value, onChange, onSelectionChange }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          markdown({ base: markdownLanguage }),
          forgeEditorTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString());
            }
            const sel = update.state.selection.main;
            if (sel && update.selectionSet && onSelectionChange) {
              const text = update.state.sliceDoc(sel.from, sel.to - sel.from);
              if (text.trim()) {
                onSelectionChange(text, sel.from, sel.to);
              }
            }
          }),
          EditorView.lineWrapping,
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    setReady(true);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes into CodeMirror (e.g. mode switch)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !ready) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value, ready]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={containerRef} className="h-full overflow-y-auto" />
    </div>
  );
}
