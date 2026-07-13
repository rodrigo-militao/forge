import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("digest.articleNewsletterIDs returns string array", async () => {
  globalThis.fetch = async (_url: RequestInfo | URL) => {
    assert.ok(String(_url).includes("/digest/article-newsletter-ids"));
    return new Response(JSON.stringify(["id-1", "id-2"]), { status: 200 });
  };

  const result = await api.digest.articleNewsletterIDs();
  assert.deepStrictEqual(result, ["id-1", "id-2"]);
});

test("digest.articleNewsletterIDs returns empty array when none used", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify([]), { status: 200 });

  const result = await api.digest.articleNewsletterIDs();
  assert.deepStrictEqual(result, []);
});

test("newsletters.addArticle sends POST with content_id", async () => {
  let url = "";
  let body = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "article added" }), { status: 200 });
  };

  await api.newsletters.addArticle("newsletter-1", "article-1");
  assert.ok(url.includes("/editions/newsletter-1/articles"));
  assert.strictEqual(JSON.parse(body).content_id, "article-1");
});

test("newsletters.removeArticle sends DELETE", async () => {
  let url = "";
  let method = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ status: "article removed" }), { status: 200 });
  };

  await api.newsletters.removeArticle("newsletter-1", "article-1");
  assert.ok(url.includes("/editions/newsletter-1/articles/article-1"));
  assert.strictEqual(method, "DELETE");
});
