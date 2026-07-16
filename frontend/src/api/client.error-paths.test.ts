import { test } from "poku";
import assert from "node:assert/strict";
import { api, setOnUnauthorized } from "./client";

test("client error paths (sequential)", async () => {
  // ── 1. Network error ──
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  try {
    await api.content.list();
    assert.fail("should have thrown");
  } catch (e: any) {
    assert.ok(e.message.includes("Network error"), "network error");
  }

  // ── 2. AbortError ──
  const abortError = new DOMException("The operation was aborted", "AbortError");
  globalThis.fetch = async () => { throw abortError; };
  try {
    await api.content.list();
    assert.fail("should have thrown");
  } catch (e: any) {
    assert.ok(e.message.includes("timed out"), "timeout on AbortError");
  }

  // ── 3. friendlyError: 400 ──
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 400, statusText: "Bad Request" });
  try { await api.content.list(); assert.fail(); }
  catch (e: any) { assert.ok(e.message.includes("Invalid request"), "400"); }

  // ── 4. friendlyError: 403 ──
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 403, statusText: "Forbidden" });
  try { await api.content.list(); assert.fail(); }
  catch (e: any) { assert.ok(e.message.includes("don't have permission"), "403"); }

  // ── 5. friendlyError: 404 ──
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 404, statusText: "Not Found" });
  try { await api.content.list(); assert.fail(); }
  catch (e: any) { assert.ok(e.message.includes("Not found"), "404"); }

  // ── 6. friendlyError: 429 ──
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 429, statusText: "Too Many Requests" });
  try { await api.content.list(); assert.fail(); }
  catch (e: any) { assert.ok(e.message.includes("Too many requests"), "429"); }

  // ── 7. friendlyError: 500 ──
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 500, statusText: "Server Error" });
  try { await api.content.list(); assert.fail(); }
  catch (e: any) { assert.ok(e.message.includes("Server error"), "500"); }

  // ── 8. friendlyError: unknown status ──
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 418, statusText: "Teapot" });
  try { await api.content.list(); assert.fail(); }
  catch (e: any) { assert.ok(e.message.includes("Request failed"), "418"); }

  // ── 9. 401 triggers onUnauthorized ──
  let unauthorizedCalled = false;
  setOnUnauthorized(() => { unauthorizedCalled = true; });
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  try { await api.content.list(); assert.fail(); }
  catch (e: any) {
    assert.ok(e.message.includes("Unauthorized"), "401 error message");
    assert.ok(unauthorizedCalled, "onUnauthorized was called on 401");
  }

  // Reset for remaining tests
  setOnUnauthorized(() => {});

  // ── 10. listDestinations ──
  globalThis.fetch = async () => new Response(JSON.stringify(["Substack", "Ghost"]), { status: 200 });
  const dests = await api.newsletters.listDestinations();
  assert.deepStrictEqual(dests, ["Substack", "Ghost"]);
});
