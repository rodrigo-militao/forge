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
(globalThis as any).HTMLElement = dom.window.HTMLHtmlElement;
(globalThis as any).Node = dom.window.Node;
(globalThis as any).self = dom.window;

// Setup minimal i18n instance
const i18n = await import("i18next");
const { initReactI18next } = await import("react-i18next");
const defaultInst = i18n.default || i18n;
defaultInst.use(initReactI18next).init({
  lng: "en",
  resources: {
    en: {
      translation: {
        editor: {
          addTag: "Add tag",
        },
      },
    },
  },
  interpolation: { escapeValue: false },
});

const { createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { TagInput } = await import("./tag-input");

let containerId = 0;
function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement("div");
  div.id = "test-" + ++containerId;
  dom.window.document.body.appendChild(div);
  return div;
}

test("TagInput renders existing tags as pills", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TagInput, {
    tags: ["golang", "react", "typescript"],
    onAdd: () => {},
    onRemove: () => {},
  }));
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(container.textContent!.includes("golang"), "should render golang tag");
  assert.ok(container.textContent!.includes("react"), "should render react tag");
  assert.ok(container.textContent!.includes("typescript"), "should render typescript tag");
  root.unmount();
});

test("TagInput calls onAdd when Enter pressed with text", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  const addedTags: string[] = [];
  root.render(createElement(TagInput, {
    tags: [],
    onAdd: (tag: string) => { addedTags.push(tag); },
    onRemove: () => {},
  }));
  await new Promise((r) => setTimeout(r, 100));

  const input = container.querySelector("input") as HTMLInputElement;
  assert.ok(input, "input should exist");

  // Set input value via native property setter
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    "value",
  )?.set;
  nativeInputValueSetter?.call(input, "new-tag");
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true, composed: true }));
  await new Promise((r) => setTimeout(r, 100));

  // Dispatch Enter keydown
  input.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
  await new Promise((r) => setTimeout(r, 20));

  assert.strictEqual(addedTags.length, 1, "should call onAdd once");
  assert.strictEqual(addedTags[0], "new-tag", "should call onAdd with the tag text");
  root.unmount();
});

test("TagInput calls onRemove when X button clicked on a tag", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  const removedTags: string[] = [];
  root.render(createElement(TagInput, {
    tags: ["golang", "react"],
    onAdd: () => {},
    onRemove: (tag: string) => { removedTags.push(tag); },
  }));
  await new Promise((r) => setTimeout(r, 100));

  // Each tag pill has a button (the X button)
  const buttons = container.querySelectorAll("span button");
  assert.ok(buttons.length >= 2, "should have remove buttons for each tag");

  // Click the X button for the first tag ("golang")
  (buttons[0] as HTMLElement).click();

  assert.strictEqual(removedTags.length, 1, "should call onRemove once");
  assert.strictEqual(removedTags[0], "golang", "should remove the correct tag");
  root.unmount();
});

test("TagInput shows empty state when no tags", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TagInput, {
    tags: [],
    onAdd: () => {},
    onRemove: () => {},
  }));
  await new Promise((r) => setTimeout(r, 100));

  const input = container.querySelector("input");
  assert.ok(input, "should render input even with no tags");
  assert.ok(!container.textContent!.includes("golang"), "should not render any tag pills");

  const buttons = container.querySelectorAll("button");
  const plusBtn = Array.from(buttons).find(
    (b) => b.querySelector("svg") !== null,
  );
  assert.ok(plusBtn, "should render add button even with no tags");
  root.unmount();
});

test("TagInput does not call onAdd for empty input via Enter", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  const addedTags: string[] = [];
  root.render(createElement(TagInput, {
    tags: [],
    onAdd: (tag: string) => { addedTags.push(tag); },
    onRemove: () => {},
  }));
  await new Promise((r) => setTimeout(r, 100));

  const input = container.querySelector("input") as HTMLInputElement;
  assert.ok(input, "input should exist");

  // Press Enter with empty value
  input.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(addedTags.length, 0, "should NOT call onAdd for empty input");
  root.unmount();
});

test("TagInput renders with custom placeholder", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TagInput, {
    tags: [],
    onAdd: () => {},
    onRemove: () => {},
    placeholder: "Type here...",
  }));
  await new Promise((r) => setTimeout(r, 100));
  const input = container.querySelector("input") as HTMLInputElement;
  assert.ok(input, "input should exist");
  assert.strictEqual(input.getAttribute("placeholder"), "Type here...");
  root.unmount();
});

test("TagInput add button is disabled when input is empty", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TagInput, {
    tags: [],
    onAdd: () => {},
    onRemove: () => {},
  }));
  await new Promise((r) => setTimeout(r, 100));

  const buttons = container.querySelectorAll("button");
  const plusBtn = Array.from(buttons).find(
    (b) => b.querySelector("svg") !== null,
  );
  assert.ok(plusBtn, "plus button should exist");
  assert.ok((plusBtn as HTMLButtonElement).disabled, "add button should be disabled when input is empty");
  root.unmount();
});

test("TagInput respects disabled prop", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(TagInput, {
    tags: ["golang"],
    onAdd: () => {},
    onRemove: () => {},
    disabled: true,
  }));
  await new Promise((r) => setTimeout(r, 100));

  const input = container.querySelector("input") as HTMLInputElement;
  assert.ok(input, "input should exist");
  assert.ok(input.disabled, "input should be disabled");

  const removeButtons = container.querySelectorAll("span button");
  for (const btn of Array.from(removeButtons)) {
    assert.ok((btn as HTMLButtonElement).disabled, "remove buttons should be disabled");
  }
  root.unmount();
});
