import { test } from "poku";
import assert from "node:assert/strict";
import { fontSizeOptions } from "./FontSize";

test("FontSize extension options have correct labels", () => {
  assert.ok(fontSizeOptions.length > 0);
  assert.equal(fontSizeOptions[0].label, "Small");
  assert.equal(fontSizeOptions[0].value, "10pt");
  assert.ok(fontSizeOptions.some((o) => o.value === "12pt"), "normal size should exist");
});
