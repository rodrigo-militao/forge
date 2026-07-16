import { test } from "poku";
import assert from "node:assert/strict";

const mod = await import("./detail-panel-articles");

test("detail-panel-articles exports components", () => {
  assert.strictEqual(typeof mod.StageSection, "function");
    assert.strictEqual(typeof mod.CopyButton, "function");
});
