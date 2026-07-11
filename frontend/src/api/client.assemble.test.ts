import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("digest.assembleEdition sends content_ids in body", async () => {
  globalThis.fetch = async (_url: RequestInfo | URL, opts?: RequestInit) => {
    assert.strictEqual(String(_url), "/api/digest/assemble-edition");
    assert.strictEqual(opts?.method, "POST");
    const body = JSON.parse(String(opts?.body));
    assert.deepStrictEqual(body, { content_ids: ["id-1", "id-2"] });
    return new Response(JSON.stringify({ edition_id: "e-1", item_count: 1 }), { status: 202 });
  };

  const result = await api.digest.assembleEdition(["id-1", "id-2"]);
  assert.strictEqual(result.item_count, 1);
});

test("digest.assembleEdition with empty array sends content_ids: []", async () => {
  globalThis.fetch = async (_url: RequestInfo | URL, opts?: RequestInit) => {
    const body = JSON.parse(String(opts?.body));
    assert.deepStrictEqual(body, { content_ids: [] });
    return new Response(JSON.stringify({ edition_id: "e-2", item_count: 1 }), { status: 202 });
  };

  const result = await api.digest.assembleEdition([]);
  assert.strictEqual(result.item_count, 1);
});
