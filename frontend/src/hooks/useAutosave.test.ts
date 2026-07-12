import { test } from "poku";
import assert from "node:assert/strict";

test("useAutosave hook compiles and has correct API shape", () => {
  // The hook is tested indirectly via integration.
  // Verify the module exports correctly.
  import("../hooks/useAutosave").then((mod) => {
    assert.equal(typeof mod.useAutosave, "function", "useAutosave should be a function");
  });
});
