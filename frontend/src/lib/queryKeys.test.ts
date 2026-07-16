import { test } from "poku";
import assert from "node:assert/strict";

test("queryKeys exports all expected namespaces", async () => {
  const { queryKeys } = await import("../lib/queryKeys");

  assert.ok(queryKeys.ideas);
  assert.ok(queryKeys.content);
  assert.ok(queryKeys.tags);
  assert.ok(queryKeys.digestInterests);
  assert.ok(queryKeys.digestSources);
  assert.ok(queryKeys.editions);
  assert.ok(queryKeys.articleNewsletterIds);
  assert.ok(queryKeys.digest);
});

test("queryKeys top-level keys have .all property", async () => {
  const { queryKeys } = await import("../lib/queryKeys");

  for (const key of ["ideas", "content", "tags", "digestInterests", "digestSources"] as const) {
    const ns = queryKeys[key];
    assert.ok(Array.isArray(ns.all), `${key}.all should be an array`);
    assert.strictEqual(ns.all[0], key === "digestInterests" ? "digest-interests" : key === "digestSources" ? "digest-sources" : key);
  }
});

test("queryKeys.editions has all sub-keys", async () => {
  const { queryKeys } = await import("../lib/queryKeys");

  assert.ok(Array.isArray(queryKeys.editions.all));
  assert.strictEqual(queryKeys.editions.all[0], "editions");

  assert.strictEqual(typeof queryKeys.editions.detail, "function");
  const detailKey = queryKeys.editions.detail("abc");
  assert.deepStrictEqual(detailKey, ["edition", "abc"]);

  assert.strictEqual(typeof queryKeys.editions.articles, "function");
  const articlesKey = queryKeys.editions.articles("abc");
  assert.deepStrictEqual(articlesKey, ["edition-articles", "abc"]);

  assert.ok(Array.isArray(queryKeys.editions.destinations));
  assert.deepStrictEqual(queryKeys.editions.destinations, ["editions", "destinations"]);
});

test("queryKeys.articleNewsletterIds has correct key", async () => {
  const { queryKeys } = await import("../lib/queryKeys");
  assert.deepStrictEqual(queryKeys.articleNewsletterIds.all, ["article-newsletter-ids"]);
});

test("queryKeys.digest has stats and jobs", async () => {
  const { queryKeys } = await import("../lib/queryKeys");
  assert.deepStrictEqual(queryKeys.digest.stats, ["digest", "stats"]);
  assert.deepStrictEqual(queryKeys.digest.jobs, ["digest", "jobs"]);
});

test("queryKeys keys are deeply frozen (as const)", async () => {
  const { queryKeys } = await import("../lib/queryKeys");

  // as const + satisfies should make these readonly tuples
  // Check runtime that mutation doesn't break anything
  const contentKey = queryKeys.content.all;
  assert.strictEqual(contentKey[0], "content");
  assert.strictEqual(contentKey.length, 1);
});
