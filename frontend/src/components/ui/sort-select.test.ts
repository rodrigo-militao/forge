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
const { SortSelect } = await import("./sort-select");

let containerId = 0;
function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement("div");
  div.id = "test-" + ++containerId;
  dom.window.document.body.appendChild(div);
  return div;
}

const options = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title" },
];

test("SortSelect renders the label", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(SortSelect, {
    value: "newest",
    onChange: () => {},
    options,
    label: "Sort by",
  }));
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(container.textContent!.includes("Sort by"), "should render the label");
  root.unmount();
});

test("SortSelect shows dropdown when button clicked", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(SortSelect, {
    value: "newest",
    onChange: () => {},
    options,
    label: "Sort",
  }));
  await new Promise((r) => setTimeout(r, 30));

  // Dropdown should not be visible initially
  const dropdownBefore = container.querySelector('[class*="absolute"]');
  assert.ok(!dropdownBefore, "dropdown should not be visible initially");

  // Click the trigger button to open
  const btn = container.querySelector("button") as HTMLElement;
  assert.ok(btn, "trigger button should exist");
  btn.click();
  await new Promise((r) => setTimeout(r, 20));

  // Dropdown should now be visible
  const dropdownAfter = container.querySelector('[class*="absolute"]');
  assert.ok(dropdownAfter, "dropdown should appear after clicking");
  root.unmount();
});

test("SortSelect calls onChange when an option is selected", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  let selectedValue = "";
  root.render(createElement(SortSelect, {
    value: "newest",
    onChange: (v: string) => { selectedValue = v; },
    options,
    label: "Sort",
  }));
  await new Promise((r) => setTimeout(r, 30));

  // Open dropdown
  const btn = container.querySelector("button") as HTMLElement;
  btn.click();
  await new Promise((r) => setTimeout(r, 20));

  // Click "Oldest" option
  const optionButtons = container.querySelectorAll('[class*="absolute"] button');
  const oldestBtn = Array.from(optionButtons).find((b) => b.textContent === "Oldest");
  assert.ok(oldestBtn, "Oldest option should exist");
  (oldestBtn as HTMLElement).click();

  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(selectedValue, "oldest", "onChange should be called with 'oldest'");
  root.unmount();
});

test("SortSelect highlights the current selected value", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(SortSelect, {
    value: "title",
    onChange: () => {},
    options,
    label: "Sort",
  }));
  await new Promise((r) => setTimeout(r, 30));

  // Open dropdown
  const btn = container.querySelector("button") as HTMLElement;
  btn.click();
  await new Promise((r) => setTimeout(r, 20));

  // Find "Title" option and check it has accent class
  const optionButtons = container.querySelectorAll('[class*="absolute"] button');
  const titleBtn = Array.from(optionButtons).find((b) => b.textContent === "Title");
  assert.ok(titleBtn, "Title option should exist");
  const classAttr = (titleBtn as HTMLElement).getAttribute("class") || "";
  assert.ok(classAttr.includes("accent"), "selected option should have accent highlight class");
  root.unmount();
});

test("SortSelect closes dropdown after selecting an option", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(SortSelect, {
    value: "newest",
    onChange: () => {},
    options,
    label: "Sort",
  }));
  await new Promise((r) => setTimeout(r, 30));

  // Open dropdown
  const btn = container.querySelector("button") as HTMLElement;
  btn.click();
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(container.querySelector('[class*="absolute"]'), "dropdown should be open");

  // Select first option
  const optionButtons = container.querySelectorAll('[class*="absolute"] button');
  (optionButtons[0] as HTMLElement).click();
  await new Promise((r) => setTimeout(r, 20));

  // Dropdown should close
  assert.ok(!container.querySelector('[class*="absolute"]'), "dropdown should close after selection");
  root.unmount();
});

test("SortSelect renders aria-label on trigger button", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(SortSelect, {
    value: "newest",
    onChange: () => {},
    options,
    label: "Sort by date",
  }));
  await new Promise((r) => setTimeout(r, 30));
  const btn = container.querySelector("button") as HTMLElement;
  assert.ok(btn, "trigger button should exist");
  assert.strictEqual(btn.getAttribute("aria-label"), "Sort by date");
  root.unmount();
});
