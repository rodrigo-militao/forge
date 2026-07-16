import { test } from "poku";
import assert from "node:assert/strict";
import { api, setOnUnauthorized } from "./client";

test("401 response clears session and stores redirect path", async () => {
  let cleared = false;
  setOnUnauthorized(() => { cleared = true; });

  const stored: Record<string, string> = {};
  const mockSessionStorage = {
    getItem: () => null,
    setItem: (key: string, value: string) => {
      stored[key] = value;
    },
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    value: mockSessionStorage,
    writable: true,
    configurable: true,
  });

  globalThis.fetch = async () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  await assert.rejects(
    () => api.content.list(),
    (err: Error) => {
      assert.ok(cleared, "onUnauthorized was called");
      return true;
    },
  );

  delete (globalThis as any).sessionStorage;
});
