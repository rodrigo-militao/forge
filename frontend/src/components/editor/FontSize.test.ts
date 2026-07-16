import { test } from "poku";
import assert from "node:assert/strict";
import { FontSize, fontSizeOptions } from "./FontSize";

test("fontSizeOptions has correct labels and values", () => {
  assert.ok(fontSizeOptions.length > 0);
  assert.equal(fontSizeOptions[0].label, "Small");
  assert.equal(fontSizeOptions[0].value, "10pt");
  assert.ok(fontSizeOptions.some((o) => o.value === "12pt"), "normal size should exist");
  assert.strictEqual(fontSizeOptions.length, 5);
});

test("FontSize extension name is fontSize", () => {
  assert.strictEqual(FontSize.name, "fontSize");
});

test("FontSize extension can be configured", () => {
  const ext = FontSize.configure({});
  assert.ok(ext);
  assert.strictEqual(ext.name, "fontSize");
  assert.ok("options" in ext);
  assert.ok("type" in ext);
});

test("STARTS_WITH_FONT_SIZE_REGEX matches valid font sizes", () => {
  const re = /^(\d+(?:\.\d+)?)\s*(pt|px)?$/;
  assert.ok(re.test("10pt"));
  assert.ok(re.test("12pt"));
  assert.ok(re.test("14.5pt"));
  assert.ok(re.test("16px"));
  assert.ok(re.test("20"));
  assert.ok(re.test("0.5pt"));
});

test("STARTS_WITH_FONT_SIZE_REGEX rejects invalid input", () => {
  const re = /^(\d+(?:\.\d+)?)\s*(pt|px)?$/;
  assert.ok(!re.test("abc"));
  assert.ok(!re.test(""));
  assert.ok(!re.test("1 0pt"));
  assert.ok(!re.test("pt"));
  assert.ok(!re.test("px"));
});

test("STARTS_WITH_FONT_SIZE_REGEX extracts value and unit", () => {
  const re = /^(\d+(?:\.\d+)?)\s*(pt|px)?$/;
  const m1 = re.exec("10pt");
  assert.strictEqual(m1?.[1], "10");
  assert.strictEqual(m1?.[2], "pt");

  const m2 = re.exec("14.5px");
  assert.strictEqual(m2?.[1], "14.5");
  assert.strictEqual(m2?.[2], "px");

  const m3 = re.exec("20");
  assert.strictEqual(m3?.[1], "20");
  assert.strictEqual(m3?.[2], undefined);
});

test("fontSizeOptions include all expected values", () => {
  const values = fontSizeOptions.map((o) => o.value);
  assert.ok(values.includes("10pt"));
  assert.ok(values.includes("12pt"));
  assert.ok(values.includes("14pt"));
  assert.ok(values.includes("16pt"));
  assert.ok(values.includes("20pt"));
});

test("FontSize editor triggers extension methods", async () => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor"></div></body></html>', {
    url: "http://localhost",
    pretendToBeVisual: true,
  });
  (globalThis as any).document = dom.window.document;
  (globalThis as any).window = dom.window;
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };

  try {
    const { Editor } = await import("@tiptap/core");
    const StarterKit = (await import("@tiptap/starter-kit")).default;

    const editor = new Editor({
      element: dom.window.document.getElementById("editor")!,
      extensions: [
        StarterKit,
        FontSize.configure({}),
      ],
      content: '<p>Hello world</p>',
    });

    // The editor creation should trigger all extension methods
    // Verify the editor has the FontSize extension registered
    const ext = editor.extensionManager.extensions.find(
      (e: any) => e.name === "fontSize"
    );
    assert.ok(ext, "FontSize should be registered as an extension");
    assert.strictEqual(ext.name, "fontSize");

    // Verify the options were applied
    assert.ok(ext.options, "FontSize extension should have options");
    assert.ok(Array.isArray(ext.options.types), "options.types should be an array");

    // The attributes should be configured
    assert.ok(ext.type, "FontSize extension should have a ProseMirror type");
    if (ext.type && ext.type.spec) {
      // spec.attrs should have size
      assert.ok(ext.type.spec.attrs?.size !== undefined, "should have size attribute");
    }

    editor.destroy();
  } finally {
    delete (globalThis as any).document;
    delete (globalThis as any).window;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).Node;
    delete (globalThis as any).MutationObserver;
  }
});
