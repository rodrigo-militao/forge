import { test } from "poku";
import assert from "node:assert/strict";

// Setup jsdom once at module level
const { JSDOM } = await import("jsdom");
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: "http://localhost",
  pretendToBeVisual: true,
});
(globalThis as any).document = dom.window.document;
(globalThis as any).window = dom.window;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Node = dom.window.Node;
(globalThis as any).self = dom.window;
// Do NOT set IS_REACT_ACT_ENVIRONMENT — it conflicts with concurrent poku tests

let containerId = 0;
function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement("div");
  div.id = "test-container-" + (++containerId);
  dom.window.document.body.appendChild(div);
  return div;
}

test("useAutosave is a function", async () => {
  const mod = await import("../hooks/useAutosave");
  assert.equal(typeof mod.useAutosave, "function");
});

test("useAutosave mount and initial state", async () => {
  const { useAutosave } = await import("../hooks/useAutosave");
  const { createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");

  const resultRef: { current: unknown } = { current: null };

  function TestComponent() {
    const result = useAutosave({ save: async () => {}, deps: [], delay: 100 });
    resultRef.current = result;
    return null;
  }

  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TestComponent));
  await new Promise((r) => setTimeout(r, 30));

  const res = resultRef.current as Record<string, unknown>;
  assert.ok(res !== null, "hook should return a result");
  assert.strictEqual(typeof res.isSynced, "boolean", "isSynced should be boolean");
  assert.strictEqual(typeof res.isSaving, "boolean", "isSaving should be boolean");

  root.unmount();
});

test("useAutosave dep change triggers dirty + save", async () => {
  const { useAutosave } = await import("../hooks/useAutosave");
  const { createElement, useState } = await import("react");
  const { createRoot } = await import("react-dom/client");

  const results: Array<Record<string, unknown>> = [];
  let setCount: (n: number) => void = () => {};
  let saveCalled = false;

  function TestComponent() {
    const [count, s] = (useState as (v: number) => [number, typeof s])(0);
    setCount = s;
    const result = useAutosave({
      save: async () => { saveCalled = true; },
      deps: [count],
      delay: 30,
    });
    results.push(result as unknown as Record<string, unknown>);
    return null;
  }

  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TestComponent));
  await new Promise((r) => setTimeout(r, 20));
  results.length = 0; // Clear initial snapshot

  // Change deps to trigger dirty
  setCount(1);
  await new Promise((r) => setTimeout(r, 10));

  // Should see unsynced after dep change
  const afterDep = results[results.length - 1] as Record<string, unknown>;
  assert.strictEqual(afterDep.isSynced, false, "should be unsynced after dep change");

  // Wait for debounce to trigger save
  await new Promise((r) => setTimeout(r, 60));
  assert.ok(saveCalled, "save triggered after debounce");

  // After save resolves, should be synced
  await new Promise((r) => setTimeout(r, 30));
  const afterSave = results[results.length - 1] as Record<string, unknown>;
  assert.strictEqual(afterSave.isSynced, true, "synced after save completes");
  assert.strictEqual(afterSave.isSaving, false, "not saving after save");

  root.unmount();
});

test("useAutosave save error sets error state", async () => {
  const { useAutosave } = await import("../hooks/useAutosave");
  const { createElement, useState } = await import("react");
  const { createRoot } = await import("react-dom/client");

  const results: Array<Record<string, unknown>> = [];
  let setCount: (n: number) => void = () => {};

  function TestComponent() {
    const [count, s] = (useState as (v: number) => [number, typeof s])(0);
    setCount = s;
    const result = useAutosave({
      save: async () => { throw new Error("DB error"); },
      deps: [count],
      delay: 30,
    });
    results.push(result as unknown as Record<string, unknown>);
    return null;
  }

  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TestComponent));
  await new Promise((r) => setTimeout(r, 20));
  results.length = 0;

  setCount(1);
  await new Promise((r) => setTimeout(r, 80));

  const last = results[results.length - 1] as Record<string, unknown>;
  assert.strictEqual(last.isSynced, false, "unsynced after error");
  assert.strictEqual(last.isSaving, false, "not saving after error");
  assert.strictEqual(last.error, "DB error", "error should match thrown message");

  root.unmount();
});

test("useAutosave enabled=false prevents saving", async () => {
  const { useAutosave } = await import("../hooks/useAutosave");
  const { createElement, useState } = await import("react");
  const { createRoot } = await import("react-dom/client");

  let saveCalled = false;
  let setCount: (n: number) => void = () => {};

  function TestComponent() {
    const [count, s] = (useState as (v: number) => [number, typeof s])(0);
    setCount = s;
    useAutosave({
      save: async () => { saveCalled = true; },
      deps: [count],
      delay: 30,
      enabled: false,
    });
    return null;
  }

  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TestComponent));
  await new Promise((r) => setTimeout(r, 20));

  setCount(1);
  await new Promise((r) => setTimeout(r, 80));

  assert.strictEqual(saveCalled, false, "save not called when disabled");

  root.unmount();
});

test("useAutosave rapid dep changes debounce", async () => {
  const { useAutosave } = await import("../hooks/useAutosave");
  const { createElement, useState } = await import("react");
  const { createRoot } = await import("react-dom/client");

  let saveCallCount = 0;
  let setCount: (n: number) => void = () => {};

  function TestComponent() {
    const [count, s] = (useState as (v: number) => [number, typeof s])(0);
    setCount = s;
    useAutosave({
      save: async () => { saveCallCount++; },
      deps: [count],
      delay: 40,
    });
    return null;
  }

  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TestComponent));
  await new Promise((r) => setTimeout(r, 20));

  // Multiple rapid changes
  setCount(1);
  setCount(2);
  setCount(3);

  await new Promise((r) => setTimeout(r, 100));
  assert.ok(saveCallCount <= 2, "rapid changes should debounce (got " + saveCallCount + ")");

  root.unmount();
});
