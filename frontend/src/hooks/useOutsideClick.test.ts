import { test } from "poku";
import assert from "node:assert/strict";

// tsx compiles JSX to React.createElement (classic transform),
// so we need React on globalThis before importing .tsx components.
const ReactMod = await import("react");
(globalThis as any).React = ReactMod.default || ReactMod;

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

const { createElement, useRef } = await import("react");
const { createRoot } = await import("react-dom/client");
const { useOutsideClick } = await import("./useOutsideClick");

let containerId = 0;
function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement("div");
  div.id = "test-" + ++containerId;
  dom.window.document.body.appendChild(div);
  return div;
}

test("useOutsideClick calls handler when click is outside the ref element", async () => {
  let handlerCalled = false;

  function TestComponent() {
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClick(ref, () => { handlerCalled = true; });
    return createElement("div", { ref });
  }

  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TestComponent));
  await new Promise((r) => setTimeout(r, 30));

  dom.window.document.body.dispatchEvent(
    new dom.window.MouseEvent("mousedown", { bubbles: true }),
  );
  assert.ok(handlerCalled, "handler should be called when clicking outside");

  root.unmount();
});

test("useOutsideClick does NOT call handler when enabled=false", async () => {
  let handlerCalled = false;

  function TestComponent() {
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClick(ref, () => { handlerCalled = true; }, false);
    return createElement("div", { ref });
  }

  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TestComponent));
  await new Promise((r) => setTimeout(r, 30));

  dom.window.document.body.dispatchEvent(
    new dom.window.MouseEvent("mousedown", { bubbles: true }),
  );
  assert.ok(!handlerCalled, "handler should NOT be called when enabled=false");

  root.unmount();
});

test("useOutsideClick uses handlerRef which always has latest handler", async () => {
  let callCount = 0;

  function TestComponent({ count }: { count: number }) {
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClick(ref, () => { callCount = count; });
    return createElement("div", { ref });
  }

  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TestComponent, { count: 42 }));
  await new Promise((r) => setTimeout(r, 30));

  dom.window.document.body.dispatchEvent(
    new dom.window.MouseEvent("mousedown", { bubbles: true }),
  );
  assert.strictEqual(callCount, 42, "handler should have the latest closure value");

  root.unmount();
});
