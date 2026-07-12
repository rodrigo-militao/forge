import { Mark, markInputRule, markPasteRule, mergeAttributes } from "@tiptap/core";

export interface FontSizeOptions {
  types: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const STARTS_WITH_FONT_SIZE_REGEX = /^(\d+(?:\.\d+)?)\s*(pt|px)?$/;

export const FontSize = Mark.create<FontSizeOptions>({
  name: "fontSize",

  addOptions() {
    return { types: ["textStyle"] };
  },

  addAttributes() {
    return {
      size: { default: null },
    };
  },

  parseHTML() {
    return [{ style: "font-size", getAttrs: (value) => ({ size: value }) }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { style: `font-size: ${HTMLAttributes.size}` }), 0];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: STARTS_WITH_FONT_SIZE_REGEX,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: STARTS_WITH_FONT_SIZE_REGEX,
        type: this.type,
      }),
    ];
  },
});

export const fontSizeOptions = [
  { label: "Small", value: "10pt" },
  { label: "Normal", value: "12pt" },
  { label: "Medium", value: "14pt" },
  { label: "Large", value: "16pt" },
  { label: "X-Large", value: "20pt" },
];
