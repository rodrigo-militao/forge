import { test } from "poku";
import assert from "node:assert/strict";

// ArticleCard is the main export — verify structure
const mod = await import("./article-card");

test("ArticleCard module exports correctly", () => {
  assert.strictEqual(typeof mod.ArticleCard, "function");
});
