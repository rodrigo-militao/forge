import { test } from "poku";
import assert from "node:assert/strict";

const { capitalize, jobTypeDisplayName } = await import("./helpers");

test("capitalize uppercases first letter", () => {
  assert.strictEqual(capitalize("hello"), "Hello");
  assert.strictEqual(capitalize("world"), "World");
  assert.strictEqual(capitalize(""), "");
});

test("capitalize leaves already-capitalized words", () => {
  assert.strictEqual(capitalize("Hello"), "Hello");
});

test("jobTypeDisplayName returns translated key for known types", () => {
  const t = (key: string) => key;
  assert.ok(jobTypeDisplayName("curate_digest", t).length > 0);
  assert.ok(jobTypeDisplayName("categorize_batch", t).length > 0);
});

test("jobTypeDisplayName falls back to capitalized type", () => {
  const t = (key: string) => key;
  const result = jobTypeDisplayName("unknown_type", t);
  assert.ok(result.includes("Unknown") || result.includes("unknown"));
});
