import { strictEqual, match } from "node:assert/strict";
import { test } from "poku";
import { detectFormat, htmlToMarkdown, markdownToHtml } from "../markdown";

test("detectFormat: empty string returns markdown", () => {
  strictEqual(detectFormat(""), "markdown");
});

test("detectFormat: plain text returns markdown", () => {
  strictEqual(detectFormat("Hello world"), "markdown");
});

test("detectFormat: markdown headings return markdown", () => {
  strictEqual(detectFormat("# Heading\n\nParagraph"), "markdown");
});

test("detectFormat: HTML p tag returns html", () => {
  strictEqual(detectFormat("<p>Hello</p>"), "html");
});

test("detectFormat: HTML div returns html", () => {
  strictEqual(detectFormat('<div class="foo">bar</div>'), "html");
});

test("detectFormat: HTML h1 returns html", () => {
  strictEqual(detectFormat("<h1>Title</h1>"), "html");
});

test("detectFormat: HTML ul returns html", () => {
  strictEqual(detectFormat("<ul><li>item</li></ul>"), "html");
});

test("detectFormat: HTML complex document returns html", () => {
  const html = `
    <h1>Title</h1>
    <p>Paragraph with <strong>bold</strong> text.</p>
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
    </ul>
  `;
  strictEqual(detectFormat(html), "html");
});

test("htmlToMarkdown: converts basic paragraph", () => {
  const result = htmlToMarkdown("<p>Hello world</p>");
  strictEqual(result.trim(), "Hello world");
});

test("htmlToMarkdown: converts heading", () => {
  const result = htmlToMarkdown("<h1>Title</h1>");
  strictEqual(result.trim(), "# Title");
});

test("htmlToMarkdown: converts h2 heading", () => {
  const result = htmlToMarkdown("<h2>Section</h2>");
  strictEqual(result.trim(), "## Section");
});

test("htmlToMarkdown: converts bold text", () => {
  const result = htmlToMarkdown("<p><strong>Bold</strong> text</p>");
  strictEqual(result.trim(), "**Bold** text");
});

test("htmlToMarkdown: converts italic text", () => {
  const result = htmlToMarkdown("<p><em>Italic</em> text</p>");
  strictEqual(result.trim(), "*Italic* text");
});

test("htmlToMarkdown: converts link", () => {
  const result = htmlToMarkdown('<p><a href="https://example.com">Example</a></p>');
  strictEqual(result.trim(), "[Example](https://example.com)");
});

test("htmlToMarkdown: converts unordered list", () => {
  const result = htmlToMarkdown("<ul><li>Item A</li><li>Item B</li></ul>");
  strictEqual(result.trim(), "-   Item A\n-   Item B");
});

test("htmlToMarkdown: converts code block", () => {
  const result = htmlToMarkdown("<pre><code>const x = 1;</code></pre>");
  strictEqual(result.trim(), "```\nconst x = 1;\n```");
});

test("htmlToMarkdown: empty string returns empty", () => {
  strictEqual(htmlToMarkdown(""), "");
});

test("markdownToHtml: converts basic paragraph", () => {
  const result = markdownToHtml("Hello world");
  strictEqual(result.trim(), "<p>Hello world</p>");
});

test("markdownToHtml: converts heading", () => {
  const result = markdownToHtml("# Title");
  strictEqual(result.trim(), "<h1>Title</h1>");
});

test("markdownToHtml: converts bold text", () => {
  const result = markdownToHtml("**Bold** text");
  strictEqual(result.trim(), "<p><strong>Bold</strong> text</p>");
});

test("markdownToHtml: converts italic text", () => {
  const result = markdownToHtml("*Italic* text");
  strictEqual(result.trim(), "<p><em>Italic</em> text</p>");
});

test("markdownToHtml: converts link", () => {
  const result = markdownToHtml("[Example](https://example.com)");
  strictEqual(result.trim(), '<p><a href="https://example.com">Example</a></p>');
});

test("markdownToHtml: converts unordered list", () => {
  const result = markdownToHtml("- Item A\n- Item B");
  strictEqual(result.trim(), "<ul>\n<li>Item A</li>\n<li>Item B</li>\n</ul>");
});

test("markdownToHtml: converts fenced code block", () => {
  const result = markdownToHtml("```\nconst x = 1;\n```");
  strictEqual(result.trim(), "<pre><code>const x = 1;\n</code></pre>");
});

test("markdownToHtml: empty string returns empty", () => {
  strictEqual(markdownToHtml(""), "");
});

test("markdownToHtml: heading with following paragraph", () => {
  const result = markdownToHtml("# Title\n\nParagraph text");
  strictEqual(result.trim(), "<h1>Title</h1>\n<p>Paragraph text</p>");
});

test("roundtrip: HTML -> Markdown -> HTML preserves content", () => {
  const original = "<h1>Title</h1>\n<p>Hello <strong>world</strong></p>";
  const md = htmlToMarkdown(original);
  const html = markdownToHtml(md);
  match(html, /<h1>Title<\/h1>/);
  match(html, /<strong>world<\/strong>/);
});

test("roundtrip: Markdown -> HTML -> Markdown preserves content", () => {
  const original = "# Title\n\nHello **world**";
  const html = markdownToHtml(original);
  const md = htmlToMarkdown(html);
  strictEqual(md.includes("# Title"), true);
  strictEqual(md.includes("**world**"), true);
});
