import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("auth.login returns user on valid credentials", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "1", email: "a@b.com", name: "Test" }), { status: 200 });

  const result = await api.auth.login({ email: "a@b.com", password: "secret123" });
  assert.strictEqual(result.email, "a@b.com");
});

test("auth.logout sends POST and returns status", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  };

  const result = await api.auth.logout();
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/auth/logout"));
  assert.strictEqual(result.status, "ok");
});

test("auth.me returns current user", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "1", email: "a@b.com", name: "Test" }), { status: 200 });

  const result = await api.auth.me();
  assert.strictEqual(result.email, "a@b.com");
});

test("auth.updateRestrictSearch sends PUT with restrict", async () => {
  let method = "";
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  };

  const result = await api.auth.updateRestrictSearch(true);
  assert.strictEqual(method, "PUT");
  assert.ok(url.includes("/auth/restrict-search"));
  assert.strictEqual(JSON.parse(body).restrict, true);
  assert.strictEqual(result.status, "ok");
});

test("auth.updateTheme sends PUT with theme", async () => {
  let body = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    body = opts?.body as string;
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  };

  await api.auth.updateTheme("dark");
  assert.ok(url.includes("/auth/theme"));
  assert.strictEqual(JSON.parse(body).theme, "dark");
});
