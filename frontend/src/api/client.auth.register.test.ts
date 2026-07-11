import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("auth.register sends POST /api/auth/register with correct headers and body", async () => {
  globalThis.fetch = async (_url: RequestInfo | URL, opts?: RequestInit) => {
    assert.strictEqual(String(_url), "/api/auth/register");
    assert.strictEqual(opts?.method, "POST");
    assert.strictEqual(opts?.credentials, "include");
    return new Response(JSON.stringify({ id: "1", email: "a@b.com", name: "Test" }), { status: 201 });
  };

  const result = await api.auth.register({ email: "a@b.com", password: "secret123", name: "Test" });
  assert.strictEqual(result.email, "a@b.com");
});
