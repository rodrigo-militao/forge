import { deepEqual, strictEqual } from "node:assert/strict";
import { test } from "poku";
import { computeOutline } from "../use-outline";

test("computeOutline: empty returns empty array", () => {
  strictEqual(computeOutline("").length, 0);
});

test("computeOutline: plain text no headings returns empty", () => {
  strictEqual(computeOutline("Hello world.\n\nSome text.").length, 0);
});

test("computeOutline: extracts h1 heading", () => {
  const r = computeOutline("# Title");
  strictEqual(r.length, 1);
  strictEqual(r[0].level, 1);
  strictEqual(r[0].text, "Title");
  strictEqual(r[0].slug, "title");
});

test("computeOutline: extracts all heading levels", () => {
  const md = "# H1\n\n## H2\n\n### H3\n\n#### H4";
  const r = computeOutline(md);
  strictEqual(r.length, 4);
  strictEqual(r[0].level, 1);
  strictEqual(r[1].level, 2);
  strictEqual(r[2].level, 3);
  strictEqual(r[3].level, 4);
});

test("computeOutline: extracts heading text without markers", () => {
  const r = computeOutline("## Section 2: Details");
  strictEqual(r[0].text, "Section 2: Details");
});

test("computeOutline: generates correct slugs", () => {
  const r = computeOutline("# Hello World!");
  strictEqual(r[0].slug, "hello-world");
});

test("computeOutline: multiple headings", () => {
  const md = "# Intro\n\nPara\n\n## Architecture\n\nMore\n\n### DDD\n\n### CQRS\n\n## Testing";
  const r = computeOutline(md);
  strictEqual(r.length, 5);
  deepEqual(r.map((h) => h.text), ["Intro", "Architecture", "DDD", "CQRS", "Testing"]);
});
