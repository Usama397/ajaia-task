import { describe, expect, it } from "vitest";
import {
  fileToTiptapDoc,
  markdownToTiptapDoc,
  plainTextToTiptapDoc,
  UnsupportedFileError,
} from "@/lib/import";

describe("plainTextToTiptapDoc", () => {
  it("splits blank-line-separated text into paragraphs", () => {
    const doc = plainTextToTiptapDoc("First paragraph.\n\nSecond paragraph.");
    expect(doc.content).toHaveLength(2);
    expect(doc.content[0].type).toBe("paragraph");
    expect(doc.content[0].content?.[0].text).toBe("First paragraph.");
    expect(doc.content[1].content?.[0].text).toBe("Second paragraph.");
  });

  it("returns a single empty paragraph for empty input", () => {
    const doc = plainTextToTiptapDoc("   ");
    expect(doc.content).toEqual([{ type: "paragraph" }]);
  });
});

describe("markdownToTiptapDoc", () => {
  it("converts headings to heading nodes", () => {
    const doc = markdownToTiptapDoc("# Title\n\n## Subtitle");
    expect(doc.content[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(doc.content[1]).toMatchObject({ type: "heading", attrs: { level: 2 } });
  });

  it("converts bold and italic markdown into marked text nodes", () => {
    const doc = markdownToTiptapDoc("This is **bold** and *italic*.");
    const paragraph = doc.content[0];
    const boldNode = paragraph.content?.find((n) => n.text === "bold");
    const italicNode = paragraph.content?.find((n) => n.text === "italic");
    expect(boldNode?.marks).toEqual([{ type: "bold" }]);
    expect(italicNode?.marks).toEqual([{ type: "italic" }]);
  });

  it("converts a bullet list into bulletList/listItem nodes", () => {
    const doc = markdownToTiptapDoc("- one\n- two\n- three");
    expect(doc.content[0].type).toBe("bulletList");
    expect(doc.content[0].content).toHaveLength(3);
    expect(doc.content[0].content?.[0].type).toBe("listItem");
  });

  it("converts an ordered list into orderedList nodes", () => {
    const doc = markdownToTiptapDoc("1. one\n2. two");
    expect(doc.content[0].type).toBe("orderedList");
    expect(doc.content[0].content).toHaveLength(2);
  });
});

describe("fileToTiptapDoc", () => {
  it("routes .md files through the markdown converter", () => {
    const doc = fileToTiptapDoc("notes.md", "# Hello");
    expect(doc.content[0].type).toBe("heading");
  });

  it("routes .txt files through the plain text converter", () => {
    const doc = fileToTiptapDoc("notes.txt", "Hello\n\nWorld");
    expect(doc.content).toHaveLength(2);
  });

  it("rejects unsupported file types", () => {
    expect(() => fileToTiptapDoc("resume.docx", "content")).toThrow(UnsupportedFileError);
  });
});
