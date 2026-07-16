import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("compose.generateTopic sends POST", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ edition_id: "e1", item_count: 5 }), { status: 200 });
  };

  const result = await api.compose.generateTopic();
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/compose/generate-topic"));
  assert.strictEqual(result.item_count, 5);
});

test("compose.generateOutline sends POST with theme", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ edition_id: "e1", item_count: 3 }), { status: 200 });
  };

  const result = await api.compose.generateOutline("AI Trends");
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/compose/generate-outline"));
  assert.strictEqual(JSON.parse(body).theme, "AI Trends");
});

test("compose.generateDraft sends POST with theme", async () => {
  let body = "";
  globalThis.fetch = async (_u: RequestInfo, opts?: RequestInit) => {
    body = opts?.body as string;
    return new Response(JSON.stringify({ edition_id: "e1", item_count: 3 }), { status: 200 });
  };

  await api.compose.generateDraft("AI Trends");
  assert.strictEqual(JSON.parse(body).theme, "AI Trends");
});

test("compose.transform sends POST with text and action", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ edition_id: "e1", item_count: 1 }), { status: 200 });
  };

  const result = await api.compose.transform("Some text", "expand");
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/compose/transform"));
  assert.strictEqual(JSON.parse(body).text, "Some text");
  assert.strictEqual(JSON.parse(body).action, "expand");
});

test("compose.writeArticle sends POST with topic_id and voice", async () => {
  let body = "";
  globalThis.fetch = async (_u: RequestInfo, opts?: RequestInit) => {
    body = opts?.body as string;
    return new Response(JSON.stringify({ edition_id: "e1", item_count: 1 }), { status: 200 });
  };

  await api.compose.writeArticle({ topic_id: "t1", voice: "professional" });
  assert.strictEqual(JSON.parse(body).topic_id, "t1");
  assert.strictEqual(JSON.parse(body).voice, "professional");
});
