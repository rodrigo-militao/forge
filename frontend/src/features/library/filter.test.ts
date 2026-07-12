import { test } from "poku";
import assert from "node:assert/strict";
import { filterLibraryContent } from "./filter";
import type { ContentItem } from "../../api/client";

function item(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: "1",
    product: "compose",
    title: "Test Article",
    body_markdown: "Body",
    status: "draft",
    source_type: "manual",
    tags: [],
    category: null,
    deleted_at: null,
    ...overrides,
  };
}

test("library filter: showDeleted=false shows non-deleted compose/newsletter only", () => {
  const items: ContentItem[] = [
    item({ id: "1", product: "compose", deleted_at: null }),
    item({ id: "2", product: "newsletter", deleted_at: null }),
    item({ id: "3", product: "digest", deleted_at: null }),
    item({ id: "4", product: "compose", deleted_at: "2024-01-01" }),
    item({ id: "5", product: "newsletter", deleted_at: "2024-01-01" }),
    item({ id: "6", product: "digest", deleted_at: "2024-01-01" }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: false,
    categoryFilter: "",
    tagFilter: "",
  });

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "1");
  assert.strictEqual(result[1].id, "2");
});

test("library filter: showDeleted=false respects category filter", () => {
  const items: ContentItem[] = [
    item({ id: "1", product: "compose", category: "tech" }),
    item({ id: "2", product: "compose", category: "design" }),
    item({ id: "3", product: "compose", category: "tech" }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: false,
    categoryFilter: "tech",
    tagFilter: "",
  });

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "1");
  assert.strictEqual(result[1].id, "3");
});

test("library filter: showDeleted=false respects tag filter", () => {
  const items: ContentItem[] = [
    item({ id: "1", tags: ["golang"] }),
    item({ id: "2", tags: ["react"] }),
    item({ id: "3", tags: ["golang", "react"] }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: false,
    categoryFilter: "",
    tagFilter: "golang",
  });

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "1");
  assert.strictEqual(result[1].id, "3");
});

test("library filter: showDeleted=false respects category + tag together", () => {
  const items: ContentItem[] = [
    item({ id: "1", category: "tech", tags: ["golang"] }),
    item({ id: "2", category: "design", tags: ["golang"] }),
    item({ id: "3", category: "tech", tags: ["react"] }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: false,
    categoryFilter: "tech",
    tagFilter: "golang",
  });

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, "1");
});

test("library filter: showDeleted=true includes deleted items", () => {
  const items: ContentItem[] = [
    item({ id: "1", product: "compose", deleted_at: null }),
    item({ id: "2", product: "compose", deleted_at: "2024-01-01" }),
    item({ id: "3", product: "digest", deleted_at: null }),
    item({ id: "4", product: "digest", deleted_at: "2024-01-01" }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: true,
    categoryFilter: "",
    tagFilter: "",
  });

  assert.strictEqual(result.length, 3);
  assert.strictEqual(result[0].id, "1");
  assert.strictEqual(result[1].id, "2");
  assert.strictEqual(result[2].id, "4");
});

test("library filter: showDeleted=true respects category filter", () => {
  const items: ContentItem[] = [
    item({ id: "1", product: "compose", category: "tech", deleted_at: null }),
    item({ id: "2", product: "compose", category: "design", deleted_at: "2024-01-01" }),
    item({ id: "3", product: "newsletter", category: "tech", deleted_at: "2024-01-01" }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: true,
    categoryFilter: "tech",
    tagFilter: "",
  });

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "1");
  assert.strictEqual(result[1].id, "3");
});

test("library filter: showDeleted=true respects tag filter", () => {
  const items: ContentItem[] = [
    item({ id: "1", tags: ["golang"], deleted_at: null }),
    item({ id: "2", tags: ["react"], deleted_at: "2024-01-01" }),
    item({ id: "3", tags: ["golang"], deleted_at: "2024-01-01" }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: true,
    categoryFilter: "",
    tagFilter: "golang",
  });

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "1");
  assert.strictEqual(result[1].id, "3");
});

test("library filter: empty content returns empty array", () => {
  const result = filterLibraryContent({
    content: [],
    showDeleted: false,
    categoryFilter: "",
    tagFilter: "",
  });

  assert.strictEqual(result.length, 0);
});

test("library filter: items with null tags handle tag filter gracefully", () => {
  const items: ContentItem[] = [
    item({ id: "1", tags: null as unknown as string[] }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: false,
    categoryFilter: "",
    tagFilter: "golang",
  });

  assert.strictEqual(result.length, 0);
});

test("library filter: items with null category are included when no filter", () => {
  const items: ContentItem[] = [
    item({ id: "1", category: null }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: false,
    categoryFilter: "",
    tagFilter: "",
  });

  assert.strictEqual(result.length, 1);
});

test("library filter: empty string categoryFilter does not filter", () => {
  const items: ContentItem[] = [
    item({ id: "1", category: "tech" }),
    item({ id: "2", category: null }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: false,
    categoryFilter: "",
    tagFilter: "",
  });

  assert.strictEqual(result.length, 2);
});

test("library filter: empty string tagFilter does not filter", () => {
  const items: ContentItem[] = [
    item({ id: "1", tags: ["golang"] }),
    item({ id: "2", tags: [] }),
  ];

  const result = filterLibraryContent({
    content: items,
    showDeleted: false,
    categoryFilter: "",
    tagFilter: "",
  });

  assert.strictEqual(result.length, 2);
});
