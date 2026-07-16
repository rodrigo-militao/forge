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

const { createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { Toggle } = await import("./toggle");

let containerId = 0;
function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement("div");
  div.id = "test-" + ++containerId;
  dom.window.document.body.appendChild(div);
  return div;
}

test("Toggle renders a button with role='switch'", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(Toggle, { checked: false, onChange: () => {} }));
  await new Promise((r) => setTimeout(r, 100));
  const btn = container.querySelector('button[role="switch"]');
  assert.ok(btn, "should render a button with role switch");
  root.unmount();
});

test("Toggle applies aria-checked=true when checked=true", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(Toggle, { checked: true, onChange: () => {} }));
  await new Promise((r) => setTimeout(r, 100));
  const btn = container.querySelector('button[role="switch"]') as HTMLElement;
  assert.ok(btn, "button should exist");
  assert.strictEqual(btn.getAttribute("aria-checked"), "true");
  root.unmount();
});

test("Toggle applies aria-checked=false when checked=false", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(Toggle, { checked: false, onChange: () => {} }));
  await new Promise((r) => setTimeout(r, 100));
  const btn = container.querySelector('button[role="switch"]') as HTMLElement;
  assert.ok(btn, "button should exist");
  assert.strictEqual(btn.getAttribute("aria-checked"), "false");
  root.unmount();
});

test("Toggle calls onChange when clicked", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  let clicked = false;
  root.render(createElement(Toggle, {
    checked: false,
    onChange: () => { clicked = true; },
  }));
  await new Promise((r) => setTimeout(r, 100));
  const btn = container.querySelector('button[role="switch"]') as HTMLElement;
  assert.ok(btn, "button should exist");
  btn.click();
  assert.ok(clicked, "onChange should be called on click");
  root.unmount();
});

test("Toggle renders with ariaLabel", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(Toggle, {
    checked: false,
    onChange: () => {},
    ariaLabel: "Enable notifications",
  }));
  await new Promise((r) => setTimeout(r, 100));
  const btn = container.querySelector('button[role="switch"]') as HTMLElement;
  assert.ok(btn, "button should exist");
  assert.strictEqual(btn.getAttribute("aria-label"), "Enable notifications");
  root.unmount();
});

test("Toggle renders inner knob span", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(Toggle, { checked: false, onChange: () => {} }));
  await new Promise((r) => setTimeout(r, 100));
  const btn = container.querySelector('button[role="switch"]') as HTMLElement;
  assert.ok(btn, "button should exist");
  const span = btn.querySelector("span");
  assert.ok(span, "should render inner span (knob)");
  root.unmount();
});
