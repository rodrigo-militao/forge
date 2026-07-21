import { test } from "poku";
import assert from "node:assert/strict";

import { setupTestEnvironment, setupTestI18n } from "../../test/setup";

const dom = await setupTestEnvironment();
await setupTestI18n({ editor: { cancel: "Cancel", confirm: "Confirm" } });

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
