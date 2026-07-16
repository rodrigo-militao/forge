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

// Setup minimal i18n instance so useTranslation works in components
const i18n = await import("i18next");
const { initReactI18next } = await import("react-i18next");
const defaultInst = i18n.default || i18n;
defaultInst.use(initReactI18next).init({
  lng: "en",
  resources: {
    en: {
      translation: {
        editor: {
          cancel: "Cancel",
          confirm: "Confirm",
        },
      },
    },
  },
  interpolation: { escapeValue: false },
});

const { createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ConfirmDialog } = await import("./confirm-dialog");

let containerId = 0;
function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement("div");
  div.id = "test-" + ++containerId;
  dom.window.document.body.appendChild(div);
  return div;
}

test("ConfirmDialog renders when open=true", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(ConfirmDialog, {
    open: true,
    message: "Are you sure?",
    onConfirm: () => {},
    onCancel: () => {},
  }));
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(container.innerHTML.length > 0, "should render content when open");
  root.unmount();
});

test("ConfirmDialog does NOT render when open=false", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(ConfirmDialog, {
    open: false,
    message: "Are you sure?",
    onConfirm: () => {},
    onCancel: () => {},
  }));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(container.textContent, "", "should render nothing when open=false");
  root.unmount();
});

test("ConfirmDialog shows the message text", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(ConfirmDialog, {
    open: true,
    message: "Delete this item?",
    onConfirm: () => {},
    onCancel: () => {},
  }));
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(container.textContent!.includes("Delete this item?"), "should display the message");
  root.unmount();
});

test("ConfirmDialog calls onConfirm when confirm button clicked", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  let confirmed = false;
  let cancelled = false;
  root.render(createElement(ConfirmDialog, {
    open: true,
    message: "Proceed?",
    onConfirm: () => { confirmed = true; },
    onCancel: () => { cancelled = true; },
    confirmLabel: "Yes",
    cancelLabel: "No",
  }));
  await new Promise((r) => setTimeout(r, 100));
  const buttons = container.querySelectorAll("button");
  const confirmBtn = Array.from(buttons).find((b) => b.textContent === "Yes");
  assert.ok(confirmBtn, "confirm button should exist");
  confirmBtn!.click();
  assert.ok(confirmed, "onConfirm should be called");
  assert.ok(!cancelled, "onCancel should NOT be called");
  root.unmount();
});

test("ConfirmDialog calls onCancel when cancel button clicked", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  let confirmed = false;
  let cancelled = false;
  root.render(createElement(ConfirmDialog, {
    open: true,
    message: "Proceed?",
    onConfirm: () => { confirmed = true; },
    onCancel: () => { cancelled = true; },
    confirmLabel: "Yes",
    cancelLabel: "No",
  }));
  await new Promise((r) => setTimeout(r, 100));
  const buttons = container.querySelectorAll("button");
  const cancelBtn = Array.from(buttons).find((b) => b.textContent === "No");
  assert.ok(cancelBtn, "cancel button should exist");
  cancelBtn!.click();
  assert.ok(cancelled, "onCancel should be called");
  assert.ok(!confirmed, "onConfirm should NOT be called");
  root.unmount();
});

test("ConfirmDialog uses default i18n labels when custom labels not provided", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(ConfirmDialog, {
    open: true,
    message: "Test",
    onConfirm: () => {},
    onCancel: () => {},
  }));
  await new Promise((r) => setTimeout(r, 100));
  const buttons = container.querySelectorAll("button");
  const texts = Array.from(buttons).map((b) => b.textContent);
  assert.ok(texts.some((t) => t === "Cancel"), "should have Cancel button from i18n");
  assert.ok(texts.some((t) => t === "Confirm"), "should have Confirm button from i18n");
  root.unmount();
});
