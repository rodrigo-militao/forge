import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";
import { useAuth } from "../features/auth/store";

test("401 response clears session and stores redirect path", async () => {
  useAuth.setState({ user: { id: "1", email: "a@b.com", name: "T" }, loading: false });

  const stored = { redirectAfterLogin: "" };
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
      assert.strictEqual(useAuth.getState().user, null);
      assert.strictEqual(useAuth.getState().loading, false);
      return true;
    },
  );

  delete (globalThis as any).sessionStorage;
});
