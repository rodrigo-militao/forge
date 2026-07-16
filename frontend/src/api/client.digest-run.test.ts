import { test } from "poku";
import assert from "node:assert/strict";
import { api } from "./client";

test("digest.run sends POST and returns job_id", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ job_id: "j1", status: "started" }), { status: 200 });
  };

  const result = await api.digest.run();
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/digest/run"));
  assert.strictEqual(result.job_id, "j1");
});

test("digest.stats returns stats", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ total_count: 10, in_newsletter_count: 3, last_discovery: "2025-01-01", draft_newsletters: 1, active_job_id: null, active_job_status: null }), { status: 200 });

  const result = await api.digest.stats();
  assert.strictEqual(result.total_count, 10);
  assert.strictEqual(result.draft_newsletters, 1);
});

test("digest.jobs returns job list", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ id: "j1", type: "curate", status: "done", error: null, created_at: "", updated_at: "" }]), { status: 200 });

  const result = await api.digest.jobs();
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].status, "done");
});

test("digest.cancel sends POST", async () => {
  let method = "";
  let url = "";
  globalThis.fetch = async (u: RequestInfo, opts?: RequestInit) => {
    url = u.toString();
    method = opts?.method ?? "";
    return new Response(JSON.stringify({ status: "canceled" }), { status: 200 });
  };

  const result = await api.digest.cancel();
  assert.strictEqual(method, "POST");
  assert.ok(url.includes("/digest/cancel"));
  assert.strictEqual(result.status, "canceled");
});
