import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("ideas.list returns items", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ id: "1", title: "Idea 1", priority: "medium", status: "open", tags: [], created_at: "", updated_at: "" }]), { status: 200 });

  const result = await api.ideas.list();
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].title, "Idea 1");
});

test("ideas.get returns single item", async () => {
  let url = "";
  globalThis.fetch = async (u: RequestInfo) => {
    url = u.toString();
    return new Response(JSON.stringify({ id: "idea-1", title: "My Idea", priority: "high", status: "open", tags: [], created_at: "", updated_at: "" }), { status: 200 });
  };

  const result = await api.ideas.get("idea-1");
  assert.ok(url.includes("/ideas/idea-1"));
  assert.strictEqual(result.id, "idea-1");
});

test("ideas.create sends POST with title", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ id: "new-1", title: "New Idea", priority: "low", status: "open", tags: [], created_at: "", updated_at: "" }), { status: 201 });
  };

  const result = await api.ideas.create({ title: "New Idea" });
  assert.strictEqual(method, "POST");
  assert.strictEqual(result.title, "New Idea");
  assert.strictEqual(JSON.parse(body).title, "New Idea");
});

test("ideas.update sends PUT with fields", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ id: "idea-1", title: "Updated", priority: "medium", status: "in_progress", tags: [], created_at: "", updated_at: "" }), { status: 200 });
  };

  const result = await api.ideas.update("idea-1", { title: "Updated", priority: "medium", status: "in_progress" });
  assert.strictEqual(method, "PUT");
  assert.ok(url.includes("/ideas/idea-1"));
  assert.strictEqual(result.title, "Updated");
  assert.strictEqual(JSON.parse(body).priority, "medium");
});

test("ideas.archive sends DELETE", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ status: "archived" }), { status: 200 });
  };

  await api.ideas.archive("idea-1");
  assert.strictEqual(method, "DELETE");
  assert.ok(url.includes("/ideas/idea-1"));
});

test("ideas.addTag sends POST with label", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "added" }), { status: 200 });
  };

  await api.ideas.addTag("idea-1", "golang");
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/ideas/idea-1/tags"));
  assert.strictEqual(JSON.parse(body).label, "golang");
});

test("ideas.removeTag sends DELETE", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ status: "removed" }), { status: 200 });
  };

  await api.ideas.removeTag("idea-1", "golang");
  assert.strictEqual(method, "DELETE");
  assert.ok(url.includes("/ideas/idea-1/tags/golang"));
});

test("ideas.promote sends POST and returns idea_id", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ idea_id: "idea-1", title: "Promoted", context: null, notes: null }), { status: 200 });
  };

  const result = await api.ideas.promote("idea-1");
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/ideas/idea-1/promote"));
  assert.strictEqual(result.idea_id, "idea-1");
});
