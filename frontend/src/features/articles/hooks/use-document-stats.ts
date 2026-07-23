import { useMemo } from "react";

export interface DocumentStats {
  words: number;
  characters: number;
  readingTimeMinutes: number;
  headings: number;
  images: number;
}

const HEADING_RE = /^#{1,4}\s/gm;
const IMAGE_RE = /!\[.*?\]\(.*?\)/g;

export function computeDocumentStats(markdown: string, referenceCount: number): DocumentStats & { references: number } {
  const words = markdown.trim()
    ? markdown.split(/\s+/).filter(Boolean).length
    : 0;
  const characters = markdown.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  const headings = (markdown.match(HEADING_RE) || []).length;
  const images = (markdown.match(IMAGE_RE) || []).length;

  return { words, characters, readingTimeMinutes, headings, images, references: referenceCount };
}

export function useDocumentStats(markdown: string, referenceCount: number): DocumentStats & { references: number } {
  return useMemo(() => computeDocumentStats(markdown, referenceCount), [markdown, referenceCount]);
}
