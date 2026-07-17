import { useCallback } from "react";
import toast from "react-hot-toast";
import type { Editor } from "@tiptap/react";
import { api } from "../api/client";

export function useAITransform() {
  const handleTransform = useCallback(
    async (action: "expand" | "rewrite", editor: Editor) => {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      if (!selectedText.trim()) {
        toast.error("Select some text first");
        return;
      }
      try {
        await api.compose.transform(selectedText, action);
        toast.success("Transform queued");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Transform failed");
      }
    },
    [],
  );

  return { handleTransform };
}
