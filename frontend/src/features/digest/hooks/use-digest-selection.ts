import { useState, useCallback } from "react";
import type { ContentItem } from "../../../api/client";

export function useDigestSelection(digestItems: ContentItem[]) {
  const [selectedArticle, setSelectedArticle] = useState<ContentItem | null>(null);

  const handleCardClick = useCallback(
    (id: string) => {
      const item = digestItems.find((c) => c.id === id);
      if (item) setSelectedArticle(item);
    },
    [digestItems],
  );

  return { selectedArticle, setSelectedArticle, handleCardClick };
}
