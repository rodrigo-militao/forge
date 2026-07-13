import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("content.updateStatus sends PUT with status", async () => {
  let method = "";
  let body = "";
  globalThis.fetch = async (url: RequestInfo, opts?: RequestInit) => {
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "updated" }), { status: 200 });
  };

  await api.content.updateStatus("abc-123", "published");
  assert.strictEqual(method, "PUT");
  assert.strictEqual(JSON.parse(body).status, "published");
});

test("content.updateStatus accepts discarded", async () => {
  let body = "";
  globalThis.fetch = async (_url: RequestInfo, opts?: RequestInit) => {
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "updated" }), { status: 200 });
  };

  await api.content.updateStatus("abc-123", "discarded");
  assert.strictEqual(JSON.parse(body).status, "discarded");
});
