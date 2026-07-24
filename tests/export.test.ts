import { describe, expect, it } from "vitest";
import { tiptapToHtml, tiptapToMarkdown } from "@/lib/export";
import type { TiptapDoc } from "@/lib/import";

const sampleDoc: TiptapDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This is " },
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " and " },
        { type: "text", text: "italic", marks: [{ type: "italic" }] },
        { type: "text", text: " and " },
        { type: "text", text: "underlined", marks: [{ type: "underline" }] },
        { type: "text", text: "." },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }] },
      ],
    },
  ],
};

describe("tiptapToMarkdown", () => {
  it("renders a heading with the right number of hashes", () => {
    const md = tiptapToMarkdown(sampleDoc);
    expect(md).toContain("# Title");
  });

  it("renders bold, italic, and underline marks", () => {
    const md = tiptapToMarkdown(sampleDoc);
    expect(md).toContain("**bold**");
    expect(md).toContain("*italic*");
    expect(md).toContain("<u>underlined</u>");
  });

  it("renders a bullet list", () => {
    const md = tiptapToMarkdown(sampleDoc);
    expect(md).toContain("- one");
    expect(md).toContain("- two");
  });

  it("renders an ordered list with numbers", () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "first" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "second" }] }] },
          ],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain("1. first");
    expect(md).toContain("2. second");
  });
});

describe("tiptapToHtml", () => {
  it("renders heading and formatting tags", () => {
    const html = tiptapToHtml(sampleDoc);
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<u>underlined</u>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
  });

  it("escapes HTML-special characters in text", () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "a < b & c > d" }] }],
    };
    const html = tiptapToHtml(doc);
    expect(html).toContain("a &lt; b &amp; c &gt; d");
    expect(html).not.toContain("a < b & c > d");
  });
});
