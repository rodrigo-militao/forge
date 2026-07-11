import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("digest.interests CRUD", async () => {
  // List
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ id: "1", label: "Go" }]), { status: 200 });
  let items = await api.digest.interests.list();
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].label, "Go");

  // Create
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "2", label: "Rust" }), { status: 201 });
  const created = await api.digest.interests.create("Rust");
  assert.strictEqual(created.label, "Rust");

  // Delete (204)
  globalThis.fetch = async () => new Response(null, { status: 204 });
  await assert.doesNotReject(async () => api.digest.interests.delete("2"));
});
