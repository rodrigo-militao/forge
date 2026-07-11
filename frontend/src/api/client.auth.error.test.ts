import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("auth.register throws on 409 conflict", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "email already registered" }), { status: 409 });

  await assert.rejects(
    () => api.auth.register({ email: "a@b.com", password: "secret123", name: "Test" }),
    { message: "email already registered" },
  );
});
