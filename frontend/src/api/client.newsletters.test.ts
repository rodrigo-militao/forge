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

  await api.newsletters.list({ status: "building" });
  assert.ok(url.includes("status=building"));
});

test("newsletters.create sends POST", async () => {
  let method = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ id: "1", title: "Test", body_html: "", tags: [], status: "building", destination: null, article_count: 0, category: null, created_at: "", updated_at: "" }), { status: 201 });
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

test("newsletters.duplicate sends POST", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ id: "dup-1", title: "Copy", body_html: "", tags: [], status: "building", destination: null, article_count: 0, category: null, created_at: "", updated_at: "" }), { status: 201 });
  };

  const result = await api.newsletters.duplicate("nl-1");
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/editions/nl-1/duplicate"));
  assert.strictEqual(result.status, "building");
});

test("newsletters.updateDestination sends PUT", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "updated" }), { status: 200 });
  };

  await api.newsletters.updateDestination("nl-1", "Substack");
  assert.strictEqual(method, "PUT");
  assert.ok(url.includes("/editions/nl-1/destination"));
  assert.strictEqual(JSON.parse(body).destination, "Substack");
});

test("newsletters.listDestinations returns string array", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify(["Substack", "Markdown genérico"]), { status: 200 });

  const result = await api.newsletters.listDestinations();
  assert.deepStrictEqual(result, ["Substack", "Markdown genérico"]);
});
