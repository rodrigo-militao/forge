import TurndownService from "turndown";
import { marked } from "marked";

// --- Singleton instances ---

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  bulletListMarker: "-",
});

const HTML_TAG_RE = /<(p|h[1-6]|div|ul|ol|li|table|pre|blockquote|hr|br|img|a)[^>]*>/i;

/**
 * Detect whether a string is HTML or Markdown.
 * Uses a simple heuristic: check for common block-level HTML tags.
 */
export function detectFormat(content: string): "html" | "markdown" {
  if (!content) return "markdown";
  return HTML_TAG_RE.test(content) ? "html" : "markdown";
}

/**
 * Convert HTML string to Markdown.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return turndown.turndown(html);
}

/**
 * Convert Markdown string to HTML.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";
  return marked.parse(md, { async: false }) as string;
}
