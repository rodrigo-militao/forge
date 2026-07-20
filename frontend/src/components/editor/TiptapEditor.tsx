import { useState, useRef } from "react";
import { useEditor, EditorContent, EditorContext } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Typography from "@tiptap/extension-typography";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Image from "@tiptap/extension-image";
import { FontSize } from "./FontSize";

// --- Tiptap Node SCSS ---
import "../tiptap-node/blockquote-node/blockquote-node.scss";
import "../tiptap-node/code-block-node/code-block-node.scss";
import "../tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "../tiptap-node/list-node/list-node.scss";
import "../tiptap-node/image-node/image-node.scss";
import "../tiptap-node/heading-node/heading-node.scss";
import "../tiptap-node/paragraph-node/paragraph-node.scss";

// --- Template styles ---
import "../tiptap-templates/simple/simple-editor.scss";

// --- UI Primitives ---
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "../tiptap-ui-primitive/toolbar";
import { Spacer } from "../tiptap-ui-primitive/spacer";

// --- Tiptap UI ---
import { MarkButton } from "../tiptap-ui/mark-button";
import { HeadingDropdownMenu } from "../tiptap-ui/heading-dropdown-menu";
import { ListDropdownMenu } from "../tiptap-ui/list-dropdown-menu";
import { LinkPopover } from "../tiptap-ui/link-popover";
import { TextAlignButton } from "../tiptap-ui/text-align-button";
import { UndoRedoButton } from "../tiptap-ui/undo-redo-button";
import { BlockquoteButton } from "../tiptap-ui/blockquote-button";
import { CodeBlockButton } from "../tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
} from "../tiptap-ui/color-highlight-popover";

interface TiptapEditorProps {
  content?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
  onSelectionChange?: (text: string, from: number, to: number) => void;
  editable?: boolean;
  className?: string;
  toolbarRight?: React.ReactNode;
  children?: React.ReactNode;
}

export function TiptapEditor({
  content = "",
  placeholder = "Start writing\u2026",
  onUpdate,
  onSelectionChange,
  editable = true,
  className = "",
  toolbarRight,
  children,
}: TiptapEditorProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    content,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        underline: false,
      }),
      Underline,
      FontSize,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[var(--color-accent-primary)] underline cursor-pointer",
        },
      }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Superscript,
      Subscript,
      Image,
    ],
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(ed.getHTML());
    },
    onSelectionUpdate: ({ editor: ed }) => {
      if (!onSelectionChange) return;
      const { from, to } = ed.state.selection;
      if (from === to) {
        onSelectionChange("", 0, 0);
        return;
      }
      const text = ed.state.doc.textBetween(from, to, " ");
      onSelectionChange(text, from, to);
    },
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
  });

  return (
    <div className={`simple-editor-wrapper flex min-h-0 flex-1 flex-col ${className}`}>
      <EditorContext.Provider value={{ editor }}>
        {/* Toolbar — sticky at top */}
        <div className="sticky top-0 z-[1] shrink-0 bg-[var(--color-bg-base)]">
          <Toolbar ref={toolbarRef} role="toolbar" aria-label="Text formatting">
            <Spacer />

            <ToolbarGroup>
              <UndoRedoButton action="undo" />
              <UndoRedoButton action="redo" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal />
              <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} portal />
              <BlockquoteButton />
              <CodeBlockButton />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <MarkButton type="bold" />
              <MarkButton type="italic" />
              <MarkButton type="strike" />
              <MarkButton type="code" />
              <MarkButton type="underline" />
              <ColorHighlightPopover />
              <LinkPopover />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <MarkButton type="superscript" />
              <MarkButton type="subscript" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <TextAlignButton align="left" />
              <TextAlignButton align="center" />
              <TextAlignButton align="right" />
              <TextAlignButton align="justify" />
            </ToolbarGroup>

            <Spacer />

            {toolbarRight && (
              <div className="flex items-center gap-1">
                {toolbarRight}
              </div>
            )}
          </Toolbar>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {children}

          <EditorContent
            editor={editor}
            className="simple-editor-content"
          />
        </div>
      </EditorContext.Provider>
    </div>
  );
}
