import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("newsletters.list sends GET /editions", async () => {
  let url = "";
  globalThis.fetch = async (u: RequestInfo) => {
    url = u.toString();
    return new Response(JSON.stringify([]), { status: 200 });
  };

  await api.newsletters.list();
  assert.ok(url.endsWith("/editions"));
});

test("newsletters.list with status filter", async () => {
  let url = "";
  globalThis.fetch = async (u: RequestInfo) => {
    url = u.toString();
    return new Response(JSON.stringify([]), { status: 200 });
  };

  await api.newsletters.list({ status: "draft" });
  assert.ok(url.includes("status=draft"));
});

test("newsletters.create sends POST", async () => {
  let method = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ id: "1", title: "Test", body_html: "", tags: [], status: "draft", category: null, created_at: "", updated_at: "" }), { status: 201 });
  };

  const result = await api.newsletters.create({ title: "Test" });
  assert.strictEqual(method, "POST");
  assert.strictEqual(result.title, "Test");
});

test("newsletters.updateStatus sends PUT", async () => {
  let method = "";
  let body = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "updated" }), { status: 200 });
  };

  await api.newsletters.updateStatus("abc-123", "published");
  assert.strictEqual(method, "PUT");
  assert.strictEqual(JSON.parse(body).status, "published");
});

test("newsletters.articles sends GET", async () => {
  let url = "";
  globalThis.fetch = async (u: RequestInfo) => {
    url = u.toString();
    return new Response(JSON.stringify([]), { status: 200 });
  };

  await api.newsletters.articles("nl-1");
  assert.ok(url.includes("/editions/nl-1/articles"));
});

test("newsletters.generateIntro sends POST", async () => {
  let method = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ status: "enqueued" }), { status: 202 });
  };

  await api.newsletters.generateIntro("abc-123");
  assert.strictEqual(method, "POST");
});
