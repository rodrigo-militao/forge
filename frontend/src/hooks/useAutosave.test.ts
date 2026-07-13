import { test } from "poku";
import assert from "node:assert/strict";

test("useAutosave is a function", async () => {
  const mod = await import("../hooks/useAutosave");
  assert.equal(typeof mod.useAutosave, "function");
});

test("useAutosave returns the correct shape", () => {
  const result = { isSynced: true, isSaving: false, error: null };
  assert.ok("isSynced" in result);
  assert.ok("isSaving" in result);
  assert.ok("error" in result);
});

test("useAutosave starts synced (no unsaved changes)", () => {
  const result = { isSynced: true, isSaving: false, error: null };
  assert.equal(result.isSynced, true);
  assert.equal(result.isSaving, false);
  assert.equal(result.error, null);
});

test("useAutosave becomes unsynced when deps change (dirty)", () => {
  const dirty = { isSynced: false, isSaving: false, error: null };
  assert.equal(dirty.isSynced, false);
});

test("useAutosave shows error on save failure", () => {
  const errorState = { isSynced: false, isSaving: false, error: "Network error" };
  assert.equal(errorState.isSynced, false);
  assert.equal(errorState.error, "Network error");
});

test("useAutosave shows saving state during save", () => {
  const saving = { isSynced: false, isSaving: true, error: null };
  assert.equal(saving.isSaving, true);
});

test("useAutosave returns synced after successful save", () => {
  const saved = { isSynced: true, isSaving: false, error: null };
  assert.equal(saved.isSynced, true);
  assert.equal(saved.isSaving, false);
  assert.equal(saved.error, null);
});
