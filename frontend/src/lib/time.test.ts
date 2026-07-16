import { test } from "poku";
import assert from "node:assert/strict";
import { formatTimeAgo } from "./time";

const mockT = (key: string, opts?: Record<string, unknown>): string => {
  if (opts && opts.n !== undefined) {
    return `${key}(${opts.n})`;
  }
  return key;
};

test("formatTimeAgo returns empty string for null input", () => {
  assert.strictEqual(formatTimeAgo(null, mockT), "");
});

test("formatTimeAgo returns empty string for undefined input", () => {
  assert.strictEqual(formatTimeAgo(undefined as unknown as string, mockT), "");
});

test("formatTimeAgo returns 'just now' for <1 minute", () => {
  const dateStr = new Date(Date.now() - 30 * 1000).toISOString();
  assert.strictEqual(formatTimeAgo(dateStr, mockT), "digest.justNow");
});

test("formatTimeAgo returns 'minutes ago' for <60 minutes", () => {
  const dateStr = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  assert.strictEqual(formatTimeAgo(dateStr, mockT), "digest.minutesAgo(5)");
});

test("formatTimeAgo returns 'hours ago' for <24 hours", () => {
  const dateStr = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(formatTimeAgo(dateStr, mockT), "digest.hoursAgo(3)");
});

test("formatTimeAgo returns 'days ago' for >=24 hours", () => {
  const dateStr = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(formatTimeAgo(dateStr, mockT), "digest.daysAgo(2)");
});

test("formatTimeAgo handles exact boundary at 1 minute", () => {
  const dateStr = new Date(Date.now() - 60 * 1000).toISOString();
  assert.strictEqual(formatTimeAgo(dateStr, mockT), "digest.minutesAgo(1)");
});

test("formatTimeAgo handles exact boundary at 60 minutes", () => {
  const dateStr = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  assert.strictEqual(formatTimeAgo(dateStr, mockT), "digest.hoursAgo(1)");
});

test("formatTimeAgo handles exact boundary at 24 hours", () => {
  const dateStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(formatTimeAgo(dateStr, mockT), "digest.daysAgo(1)");
});
