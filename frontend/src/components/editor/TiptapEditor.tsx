import { useCallback, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
} from "lucide-react";
import { FontSize, fontSizeOptions } from "./FontSize";

interface TiptapEditorProps {
  content?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
  editable?: boolean;
  className?: string;
}

export function TiptapEditor({
  content = "",
  placeholder = "Start writing\u2026",
  onUpdate,
  editable = true,
  className = "",
}: TiptapEditorProps) {
  const [linkURL, setLinkURL] = useState("");

  const editor = useEditor({
    content,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      FontSize,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[var(--color-accent-primary)] underline cursor-pointer" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[200px] text-sm leading-relaxed",
      },
    },
  });

  const addLink = useCallback(() => {
    if (!editor) return;
    if (linkURL.trim()) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkURL.trim() }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkURL("");
  }, [editor, linkURL]);

  if (!editor) return null;

  return (
    <div className={`rounded-lg border border-[var(--color-border)]/20 bg-white/5 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-border)]/10 px-2 py-1.5">
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 size={15} />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-[var(--color-border)]/20" />

        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Code"
        >
          <Code size={15} />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-[var(--color-border)]/20" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered size={15} />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-[var(--color-border)]/20" />

        {/* Font size */}
        <select
          value={editor.getAttributes("fontSize").size ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val) editor.chain().focus().setFontSize(val).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
          className="cursor-pointer rounded border border-[var(--color-border)]/10 bg-transparent px-1 py-0.5 text-xs text-[var(--color-text-muted)] focus:outline-none"
          title="Font size"
        >
          <option value="">Size</option>
          {fontSizeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="mx-1 h-4 w-px bg-[var(--color-border)]/20" />

        {/* Link */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={linkURL}
            onChange={(e) => setLinkURL(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLink()}
            placeholder="https://..."
            className="w-28 rounded border border-[var(--color-border)]/10 bg-transparent px-1.5 py-0.5 text-xs text-[var(--color-text-muted)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none"
          />
          <ToolbarButton active={editor.isActive("link")} onClick={addLink} title="Add link">
            <Link size={15} />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor content */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`cursor-pointer rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-bg-surface)] ${
        active ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]" : ""
      }`}
    >
      {children}
    </button>
  );
}
