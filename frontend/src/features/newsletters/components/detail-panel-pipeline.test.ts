import { test } from "poku";
import assert from "node:assert/strict";

// getStage and statusConfig are pure functions — no React rendering needed.
const { getStage, statusConfig } = await import("./detail-panel-pipeline");
import type { NewsletterEdition } from "../../../api/client";

function makeEdition(overrides: Partial<NewsletterEdition> = {}): NewsletterEdition {
  return {
    id: "1",
    user_id: "u1",
    title: "Test",
    body_html: "",
    status: "building",
    destination: null,
    article_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: null,
    tags: [],
    stage: null,
    ...overrides,
  };
}

test("getStage returns 'archived' for archived status", () => {
  const item = makeEdition({ status: "archived" });
  assert.strictEqual(getStage(item), "archived");
});

test("getStage returns 'published' for published status", () => {
  const item = makeEdition({ status: "published" });
  assert.strictEqual(getStage(item), "published");
});

test("getStage returns 'ready' for ready status", () => {
  const item = makeEdition({ status: "ready" });
  assert.strictEqual(getStage(item), "ready");
});

test("getStage returns 'compose' for building with articles", () => {
  const item = makeEdition({ status: "building", article_count: 3 });
  assert.strictEqual(getStage(item), "compose");
});

test("getStage returns 'discover' for building with no articles", () => {
  const item = makeEdition({ status: "building", article_count: 0 });
  assert.strictEqual(getStage(item), "discover");
});

test("getStage returns 'discover' for unknown statuses", () => {
  const item = makeEdition({ status: "unknown" as any });
  assert.strictEqual(getStage(item), "discover");
});

test("statusConfig has entries for building, ready, published, archived", () => {
  assert.ok(statusConfig["building"]);
  assert.ok(statusConfig["ready"]);
  assert.ok(statusConfig["published"]);
  assert.ok(statusConfig["archived"]);
  assert.strictEqual(typeof statusConfig["building"].labelKey, "string");
  assert.strictEqual(typeof statusConfig["building"].className, "string");
});
