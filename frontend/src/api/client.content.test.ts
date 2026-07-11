import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("content.list returns items", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ id: "1", product: "digest", status: "draft", title: "Test", source_type: "discovery" }]), { status: 200 });

  const result = await api.content.list();
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].title, "Test");
});
