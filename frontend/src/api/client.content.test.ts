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

test("content.delete sends DELETE", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ status: "deleted" }), { status: 200 });
  };

  await api.content.delete("item-1");
  assert.strictEqual(method, "DELETE");
  assert.ok(url.includes("/content/item-1"));
});

test("content.removeTag sends DELETE", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ status: "removed" }), { status: 200 });
  };

  await api.content.removeTag("item-1", "golang");
  assert.strictEqual(method, "DELETE");
  assert.ok(url.includes("/content/item-1/tags/golang"));
});

test("content.updateOutline sends PUT with outline", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "updated" }), { status: 200 });
  };

  await api.content.updateOutline("item-1", "Section 1\nSection 2");
  assert.strictEqual(method, "PUT");
  assert.ok(url.includes("/content/item-1/outline"));
  assert.strictEqual(JSON.parse(body).outline, "Section 1\nSection 2");
});

test("content.updateCategories sends PUT with categories", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "updated" }), { status: 200 });
  };

  await api.content.updateCategories("item-1", ["tech", "design"]);
  assert.strictEqual(method, "PUT");
  assert.ok(url.includes("/content/item-1/categories"));
  assert.deepStrictEqual(JSON.parse(body).categories, ["tech", "design"]);
});

test("content.addCategory sends POST with category", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "added" }), { status: 200 });
  };

  await api.content.addCategory("item-1", "tech");
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/content/item-1/categories"));
  assert.strictEqual(JSON.parse(body).category, "tech");
});

test("content.removeCategory sends DELETE", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ status: "removed" }), { status: 200 });
  };

  await api.content.removeCategory("item-1", "tech");
  assert.strictEqual(method, "DELETE");
  assert.ok(url.includes("/content/item-1/categories/tech"));
});

test("content.addTag sends POST with tag", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "added" }), { status: 200 });
  };

  await api.content.addTag("item-1", "golang");
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/content/item-1/tags"));
  assert.strictEqual(JSON.parse(body).tag, "golang");
});

test("content.listCategories returns string array", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify(["tech", "design"]), { status: 200 });

  const result = await api.content.listCategories();
  assert.deepStrictEqual(result, ["tech", "design"]);
});

test("content.listTags returns string array", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify(["golang", "react"]), { status: 200 });

  const result = await api.content.listTags();
  assert.deepStrictEqual(result, ["golang", "react"]);
});
