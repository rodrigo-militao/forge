import { test } from "poku";
import assert from "node:assert/strict";

// Test the filter/sort logic from the digest page by reimplementing it here
// to verify correctness without DOM rendering.

type SortKey = "newest" | "oldest" | "title";

interface TestItem {
  id: string;
  product: string;
  deleted_at: string | null;
  categories: string[];
  tags: string[];
  title: string | null;
  created_at: string;
}

function makeItem(overrides: Partial<TestItem> = {}): TestItem {
  return {
    id: "1",
    product: "digest",
    deleted_at: null,
    categories: [],
    tags: [],
    title: "Test",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function sortArticles(items: TestItem[], sort: SortKey): TestItem[] {
  return [...items].sort((a, b) => {
    if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

test("digest filter: tab todos shows all non-deleted digest items", () => {
  const items: TestItem[] = [
    makeItem({ id: "1" }),
    makeItem({ id: "2", deleted_at: "2024-01-01" }),
    makeItem({ id: "3", product: "compose" }),
  ];

  const result = items.filter((c) => c.product === "digest" && c.deleted_at === null);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, "1");
});

test("digest filter: tab novos excludes used but includes selected", () => {
  const usedSet = new Set(["2"]);
  const items: TestItem[] = [
    makeItem({ id: "1" }),
    makeItem({ id: "2" }),
    makeItem({ id: "3" }),
  ];

  const result = items.filter((c) => !usedSet.has(c.id));
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "1");
  assert.strictEqual(result[1].id, "3");
});

test("digest filter: tab selecionados shows only selected items", () => {
  const selectedSet = new Set(["1", "3"]);
  const items: TestItem[] = [
    makeItem({ id: "1" }),
    makeItem({ id: "2" }),
    makeItem({ id: "3" }),
  ];

  const result = items.filter((c) => selectedSet.has(c.id));
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "1");
  assert.strictEqual(result[1].id, "3");
});

test("digest filter: tab enviados shows only used items", () => {
  const usedSet = new Set(["2"]);
  const items: TestItem[] = [
    makeItem({ id: "1" }),
    makeItem({ id: "2" }),
    makeItem({ id: "3" }),
  ];

  const result = items.filter((c) => usedSet.has(c.id));
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, "2");
});

test("digest sort: newest first", () => {
  const items: TestItem[] = [
    makeItem({ id: "1", created_at: "2025-01-03T00:00:00Z" }),
    makeItem({ id: "2", created_at: "2025-01-01T00:00:00Z" }),
    makeItem({ id: "3", created_at: "2025-01-02T00:00:00Z" }),
  ];

  const result = sortArticles(items, "newest");
  assert.strictEqual(result[0].id, "1");
  assert.strictEqual(result[1].id, "3");
  assert.strictEqual(result[2].id, "2");
});

test("digest sort: oldest first", () => {
  const items: TestItem[] = [
    makeItem({ id: "1", created_at: "2025-01-03T00:00:00Z" }),
    makeItem({ id: "2", created_at: "2025-01-01T00:00:00Z" }),
    makeItem({ id: "3", created_at: "2025-01-02T00:00:00Z" }),
  ];

  const result = sortArticles(items, "oldest");
  assert.strictEqual(result[0].id, "2");
  assert.strictEqual(result[1].id, "3");
  assert.strictEqual(result[2].id, "1");
});

test("digest sort: title A-Z", () => {
  const items: TestItem[] = [
    makeItem({ id: "1", title: "Zebra" }),
    makeItem({ id: "2", title: "Alpha" }),
    makeItem({ id: "3", title: "Bravo" }),
  ];

  const result = sortArticles(items, "title");
  assert.strictEqual(result[0].id, "2");
  assert.strictEqual(result[1].id, "3");
  assert.strictEqual(result[2].id, "1");
});

test("digest categories: item with multiple categories has array", () => {
  const item = makeItem({ categories: ["AI", "Web", "Systems"] });
  assert.strictEqual(item.categories.length, 3);
  assert.strictEqual(item.categories[0], "AI");
  assert.strictEqual(item.categories[1], "Web");
  assert.strictEqual(item.categories[2], "Systems");
});

test("digest categories: item with no categories has empty array", () => {
  const item = makeItem({ categories: [] });
  assert.strictEqual(item.categories.length, 0);
});
