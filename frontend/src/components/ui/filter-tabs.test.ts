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
        "tab.all": "All",
        "tab.draft": "Drafts",
        "tab.published": "Published",
      },
    },
  },
  interpolation: { escapeValue: false },
});

const { createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { FilterTabs } = await import("./filter-tabs");

let containerId = 0;
function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement("div");
  div.id = "test-" + ++containerId;
  dom.window.document.body.appendChild(div);
  return div;
}

const tabs = [
  { id: "all", labelKey: "tab.all" },
  { id: "draft", labelKey: "tab.draft" },
  { id: "published", labelKey: "tab.published" },
];

test("FilterTabs renders all tab items", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(FilterTabs, {
    tabs,
    active: "all",
    onChange: () => {},
    counts: { all: 10, draft: 3, published: 7 },
  }));
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(container.textContent!.includes("All"), "should render All tab");
  assert.ok(container.textContent!.includes("Drafts"), "should render Drafts tab");
  assert.ok(container.textContent!.includes("Published"), "should render Published tab");
  root.unmount();
});

test("FilterTabs highlights the active tab", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(FilterTabs, {
    tabs,
    active: "draft",
    onChange: () => {},
    counts: { all: 10, draft: 3, published: 7 },
  }));
  await new Promise((r) => setTimeout(r, 100));

  const buttons = container.querySelectorAll("button");
  const draftBtn = Array.from(buttons).find((b) => b.textContent!.startsWith("Drafts"));
  assert.ok(draftBtn, "draft button should exist");
  const classAttr = draftBtn!.getAttribute("class") || "";
  assert.ok(classAttr.includes("accent"), "active tab should have accent background class");
  root.unmount();
});

test("FilterTabs does NOT highlight inactive tabs", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(FilterTabs, {
    tabs,
    active: "draft",
    onChange: () => {},
    counts: { all: 10, draft: 3, published: 7 },
  }));
  await new Promise((r) => setTimeout(r, 100));

  const buttons = container.querySelectorAll("button");
  const allBtn = Array.from(buttons).find((b) => b.textContent!.startsWith("All"));
  assert.ok(allBtn, "all button should exist");
  const classAttr = allBtn!.getAttribute("class") || "";
  assert.ok(!classAttr.includes("accent"), "inactive tab should not have accent class");
  root.unmount();
});

test("FilterTabs calls onTabChange when a tab is clicked", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  let selectedTab = "";
  root.render(createElement(FilterTabs, {
    tabs,
    active: "all",
    onChange: (tab: string) => { selectedTab = tab; },
    counts: { all: 10, draft: 3, published: 7 },
  }));
  await new Promise((r) => setTimeout(r, 100));

  const buttons = container.querySelectorAll("button");
  const publishedBtn = Array.from(buttons).find((b) => b.textContent!.startsWith("Published"));
  assert.ok(publishedBtn, "published button should exist");
  (publishedBtn as HTMLElement).click();

  assert.strictEqual(selectedTab, "published", "onChange should be called with 'published'");
  root.unmount();
});

test("FilterTabs shows counts next to each tab", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(FilterTabs, {
    tabs,
    active: "all",
    onChange: () => {},
    counts: { all: 10, draft: 3, published: 7 },
  }));
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(container.textContent!.includes("(10)"), "should show count 10 for All");
  assert.ok(container.textContent!.includes("(3)"), "should show count 3 for Drafts");
  assert.ok(container.textContent!.includes("(7)"), "should show count 7 for Published");
  root.unmount();
});

test("FilterTabs shows 0 count for missing counts", async () => {
  const container = makeContainer();
  const root = createRoot(container);
  root.render(createElement(FilterTabs, {
    tabs,
    active: "all",
    onChange: () => {},
    counts: {},
  }));
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(container.textContent!.includes("(0)"), "should show 0 for missing counts");
  root.unmount();
});
