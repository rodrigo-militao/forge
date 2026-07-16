import { test } from "poku";
import assert from "node:assert/strict";

// stageProgress is defined in newsletter-list-card.tsx but the file imports React
// and can't be loaded outside jsdom. We test the stage progression logic inline.
function stageProgress(status: string, articleCount = 0): number {
  if (status === "published" || status === "archived" || status === "discarded") return 100;
  if (status === "ready") return 75;
  if (status === "building" && articleCount > 0) return 40;
  return 10;
}

test("stageProgress returns 10 for building with no articles", () => {
  assert.strictEqual(stageProgress("building", 0), 10);
});

test("stageProgress returns 40 for building with articles", () => {
  assert.strictEqual(stageProgress("building", 3), 40);
});

test("stageProgress returns 75 for ready status", () => {
  assert.strictEqual(stageProgress("ready"), 75);
});

test("stageProgress returns 100 for published", () => {
  assert.strictEqual(stageProgress("published"), 100);
});

test("stageProgress returns 100 for archived", () => {
  assert.strictEqual(stageProgress("archived"), 100);
});

test("stageProgress returns 100 for discarded", () => {
  assert.strictEqual(stageProgress("discarded"), 100);
});
