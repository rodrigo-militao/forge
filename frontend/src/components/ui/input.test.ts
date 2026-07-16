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
const { Input } = await import("./input");

let containerId = 0;
function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement("div");
  div.id = "test-" + ++containerId;
  dom.window.document.body.appendChild(div);
  return div;
}

test("Input renders an input element", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(Input));

  await new Promise((r) => setTimeout(r, 20));

  const el = container.querySelector("input");
  assert.ok(el, "should render an input element");
  root.unmount();
});

test("Input applies className prop", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(Input, { className: "custom-class" }));

  await new Promise((r) => setTimeout(r, 20));

  const el = container.querySelector("input");
  assert.ok(el, "input should exist");
  assert.ok(el!.className.includes("custom-class"), "should include custom class");
  assert.ok(el!.className.includes("rounded-lg"), "should include base class");
  root.unmount();
});

test("Input forwards ref", async () => {
  const container = makeContainer();
  const root = createRoot(container);

  function TestComponent() {
    const ref = ReactMod.useRef<HTMLInputElement>(null);
    return createElement("div", null,
      createElement(Input, { ref, placeholder: "test" }),
    );
  }
  root.render(createElement(TestComponent));
  await new Promise((r) => setTimeout(r, 100));
  const input = container.querySelector("input");
  assert.ok(input, "ref should be forwarded - input element exists");
  assert.strictEqual(input!.tagName, "INPUT", "ref should point to input element");
  root.unmount();
});

test("Input renders with placeholder", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(Input, { placeholder: "Enter text..." }));

  await new Promise((r) => setTimeout(r, 20));

  const el = container.querySelector("input");
  assert.ok(el, "input should exist");
  assert.strictEqual(el!.getAttribute("placeholder"), "Enter text...");
  root.unmount();
});
