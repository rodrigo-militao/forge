import { test } from "poku";
import assert from "node:assert/strict";
import { useAuth } from "./store";

test("register sets user on success, rejects on conflict, load handles 401", async () => {
  useAuth.setState({ user: null, loading: true });

  // Register success
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "1", email: "a@b.com", name: "Test" }), { status: 201 });
  await useAuth.getState().register("a@b.com", "secret", "Test");
  assert.strictEqual(useAuth.getState().user?.email, "a@b.com");

  // Login
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "1", email: "a@b.com", name: "Test" }), { status: 200 });
  await useAuth.getState().login("a@b.com", "secret");
  assert.strictEqual(useAuth.getState().user?.email, "a@b.com");

  // Load
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "1", email: "a@b.com", name: "Test" }), { status: 200 });
  await useAuth.getState().load();
  assert.strictEqual(useAuth.getState().user?.email, "a@b.com");
  assert.strictEqual(useAuth.getState().loading, false);

  // Logout
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  await useAuth.getState().logout();
  assert.strictEqual(useAuth.getState().user, null);

  // Reject on conflict
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "email taken" }), { status: 409 });
  await assert.rejects(() => useAuth.getState().register("a@b.com", "secret", "Test"));
  assert.strictEqual(useAuth.getState().user, null);

  // 401 handled gracefully
  globalThis.fetch = async () => new Response(null, { status: 401 });
  await useAuth.getState().load();
  assert.strictEqual(useAuth.getState().user, null);
  assert.strictEqual(useAuth.getState().loading, false);
});
