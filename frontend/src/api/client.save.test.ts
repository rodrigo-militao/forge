import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("content.save sends PUT with title and body_markdown", async () => {
  globalThis.fetch = async (_url: RequestInfo | URL, opts?: RequestInit) => {
    assert.strictEqual(String(_url), "/api/content/item-1");
    assert.strictEqual(opts?.method, "PUT");
    const body = JSON.parse(String(opts?.body));
    assert.strictEqual(body.title, "Edited Title");
    assert.strictEqual(body.body_markdown, "Edited body content");
    return new Response(JSON.stringify({ status: "saved" }), { status: 200 });
  };

  const result = await api.content.save("item-1", { title: "Edited Title", body_markdown: "Edited body content" });
  assert.strictEqual(result.status, "saved");
});

test("content.save partial update (title only)", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ status: "saved" }), { status: 200 });

  await assert.doesNotReject(() => api.content.save("item-1", { title: "New Title" }));
});
