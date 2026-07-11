import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("digest.sources CRUD", async () => {
  // List
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ id: "1", name: "Go Blog", type: "rss", config: { url: "https://go.dev/feed" }, enabled: true }]), { status: 200 });
  let items = await api.digest.sources.list();
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].name, "Go Blog");

  // Create
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "2", name: "Dev Blog", type: "rss", config: { url: "https://dev.blog/feed" }, enabled: true }), { status: 201 });
  const created = await api.digest.sources.create({ name: "Dev Blog", type: "rss", config: { url: "https://dev.blog/feed" } });
  assert.strictEqual(created.name, "Dev Blog");

  // Update
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "2", name: "Dev Blog Updated", type: "rss", config: { url: "https://dev.blog/feed" }, enabled: false }), { status: 200 });
  const updated = await api.digest.sources.update("2", { name: "Dev Blog Updated", type: "rss", config: { url: "https://dev.blog/feed" }, enabled: false });
  assert.strictEqual(updated.name, "Dev Blog Updated");
  assert.strictEqual(updated.enabled, false);

  // Delete (204)
  globalThis.fetch = async () => new Response(null, { status: 204 });
  await assert.doesNotReject(async () => api.digest.sources.delete("2"));
});
