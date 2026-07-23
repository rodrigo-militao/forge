import { useMemo } from "react";

const HEADING_RE = /^(#{1,4})\s+(.+)$/gm;

export interface OutlineItem {
  level: number;
  text: string;
  slug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function computeOutline(markdown: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  let match: RegExpExecArray | null;

  const re = new RegExp(HEADING_RE);
  while ((match = re.exec(markdown)) !== null) {
    items.push({
      level: match[1].length,
      text: match[2],
      slug: slugify(match[2]),
    });
  }

  return items;
}

export function useOutline(markdown: string): OutlineItem[] {
  return useMemo(() => computeOutline(markdown), [markdown]);
}
