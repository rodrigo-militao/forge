import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("auth.login returns user on valid credentials", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "1", email: "a@b.com", name: "Test" }), { status: 200 });

  const result = await api.auth.login({ email: "a@b.com", password: "secret123" });
  assert.strictEqual(result.email, "a@b.com");
});
