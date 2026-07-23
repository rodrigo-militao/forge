import { strictEqual } from "node:assert/strict";
import { test } from "poku";
import { computeDocumentStats } from "../use-document-stats";

test("computeDocumentStats: empty returns zeros", () => {
  const r = computeDocumentStats("", 0);
  strictEqual(r.words, 0);
  strictEqual(r.characters, 0);
  strictEqual(r.readingTimeMinutes, 1);
  strictEqual(r.headings, 0);
  strictEqual(r.images, 0);
  strictEqual(r.references, 0);
});

test("computeDocumentStats: counts words correctly", () => {
  const r = computeDocumentStats("Hello world foo bar", 0);
  strictEqual(r.words, 4);
});

test("computeDocumentStats: counts characters correctly", () => {
  const r = computeDocumentStats("Hello world", 0);
  strictEqual(r.characters, 11);
});

test("computeDocumentStats: reading time is ceil(words/200)", () => {
  const r1 = computeDocumentStats("word", 0);
  strictEqual(r1.readingTimeMinutes, 1, "1 word → 1 min");

  const lots = Array.from({ length: 200 }).map((_, i) => `word${i}`).join(" ");
  const r2 = computeDocumentStats(lots, 0);
  strictEqual(r2.readingTimeMinutes, 1, "200 words → 1 min");

  const r3 = computeDocumentStats(lots + " extra", 0);
  strictEqual(r3.readingTimeMinutes, 2, "201 words → 2 min");
});

test("computeDocumentStats: counts headings correctly", () => {
  const md = "# H1\n## H2\n### H3\n#### H4\n\nParagraph";
  const r = computeDocumentStats(md, 0);
  strictEqual(r.headings, 4);
});

test("computeDocumentStats: counts images correctly", () => {
  const md = "![alt](img.png)\n\n![caption](photo.jpg)";
  const r = computeDocumentStats(md, 0);
  strictEqual(r.images, 2);
});

test("computeDocumentStats: references passed through", () => {
  const r = computeDocumentStats("# Hello", 5);
  strictEqual(r.references, 5);
});
