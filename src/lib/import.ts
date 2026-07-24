import { marked } from "marked";
import type { Tokens } from "marked";
import mammoth from "mammoth";
import { parse as parseHtml, NodeType } from "node-html-parser";
import type { HTMLElement as ParsedHTMLElement, Node as ParsedNode } from "node-html-parser";

export type TiptapMark = { type: string };
export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
  text?: string;
};
export type TiptapDoc = { type: "doc"; content: TiptapNode[] };

export const SUPPORTED_IMPORT_EXTENSIONS = ["txt", "md", "markdown", "docx"] as const;
export const MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (docx files run larger than plain text)

export class UnsupportedFileError extends Error {}

export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/** Converts an uploaded .txt, .md, or .docx file into a Tiptap document. */
export async function fileToTiptapDoc(filename: string, buffer: Buffer): Promise<TiptapDoc> {
  const ext = getFileExtension(filename);
  if (ext === "md" || ext === "markdown") {
    return markdownToTiptapDoc(buffer.toString("utf-8"));
  }
  if (ext === "txt") {
    return plainTextToTiptapDoc(buffer.toString("utf-8"));
  }
  if (ext === "docx") {
    return docxToTiptapDoc(buffer);
  }
  throw new UnsupportedFileError(
    `Unsupported file type ".${ext || "unknown"}". Only .txt, .md, and .docx files can be imported.`
  );
}

export function plainTextToTiptapDoc(text: string): TiptapDoc {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  return {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: textWithHardBreaks(paragraph),
    })),
  };
}

function textWithHardBreaks(paragraph: string): TiptapNode[] {
  const lines = paragraph.split("\n");
  const nodes: TiptapNode[] = [];
  lines.forEach((line, i) => {
    if (line.length > 0) nodes.push({ type: "text", text: line });
    if (i < lines.length - 1) nodes.push({ type: "hardBreak" });
  });
  return nodes;
}

export function markdownToTiptapDoc(markdown: string): TiptapDoc {
  const blockTokens = marked.lexer(markdown);
  const content = blocksToNodes(blockTokens).filter(Boolean);
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

function blocksToNodes(tokens: Tokens.Generic[]): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  for (const token of tokens) {
    const node = blockToNode(token);
    if (node) nodes.push(node);
  }
  return nodes;
}

function blockToNode(token: Tokens.Generic): TiptapNode | null {
  switch (token.type) {
    case "heading": {
      const heading = token as Tokens.Heading;
      const level = Math.min(Math.max(heading.depth, 1), 3);
      return {
        type: "heading",
        attrs: { level },
        content: inlineTokensToNodes(heading.tokens ?? []),
      };
    }
    case "paragraph": {
      const paragraph = token as Tokens.Paragraph;
      return { type: "paragraph", content: inlineTokensToNodes(paragraph.tokens ?? []) };
    }
    case "list": {
      const list = token as Tokens.List;
      const items = list.items.map((item) => listItemToNode(item));
      return list.ordered
        ? { type: "orderedList", attrs: { start: list.start || 1 }, content: items }
        : { type: "bulletList", content: items };
    }
    case "space":
      return null;
    default: {
      // Fall back to plain text for anything we don't specially handle (code blocks, etc.)
      const text = "text" in token ? String((token as unknown as { text: string }).text) : "";
      if (!text.trim()) return null;
      return { type: "paragraph", content: [{ type: "text", text }] };
    }
  }
}

function listItemToNode(item: Tokens.ListItem): TiptapNode {
  const blockTokens = (item.tokens ?? []).filter((t) => t.type !== "space");
  const hasBlockChildren = blockTokens.some((t) => t.type === "list" || t.type === "paragraph");

  if (hasBlockChildren) {
    return { type: "listItem", content: blocksToNodes(blockTokens) };
  }

  // Tight list items: tokens are inline (text/strong/em/...) directly under the item.
  const inline = blockTokens.flatMap((t) =>
    "tokens" in t && t.tokens ? inlineTokensToNodes(t.tokens) : inlineTokensToNodes([t])
  );
  return { type: "listItem", content: [{ type: "paragraph", content: inline }] };
}

function inlineTokensToNodes(tokens: Tokens.Generic[], marks: TiptapMark[] = []): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "strong":
        nodes.push(
          ...inlineTokensToNodes((token as Tokens.Strong).tokens ?? [], [...marks, { type: "bold" }])
        );
        break;
      case "em":
        nodes.push(
          ...inlineTokensToNodes((token as Tokens.Em).tokens ?? [], [...marks, { type: "italic" }])
        );
        break;
      case "del":
        nodes.push(
          ...inlineTokensToNodes((token as Tokens.Del).tokens ?? [], [...marks, { type: "strike" }])
        );
        break;
      case "codespan":
        nodes.push({
          type: "text",
          text: (token as Tokens.Codespan).text,
          marks: [...marks, { type: "code" }],
        });
        break;
      case "text": {
        const textToken = token as Tokens.Text;
        if (textToken.tokens && textToken.tokens.length > 0) {
          nodes.push(...inlineTokensToNodes(textToken.tokens, marks));
        } else if (textToken.text) {
          nodes.push({ type: "text", text: textToken.text, marks: marks.length ? marks : undefined });
        }
        break;
      }
      case "br":
        nodes.push({ type: "hardBreak" });
        break;
      default: {
        const text = "text" in token ? String((token as unknown as { text: string }).text) : "";
        if (text) nodes.push({ type: "text", text, marks: marks.length ? marks : undefined });
      }
    }
  }
  return nodes;
}

/** Extracts a .docx file's content (via mammoth) as HTML, then converts that to Tiptap JSON. */
export async function docxToTiptapDoc(buffer: Buffer): Promise<TiptapDoc> {
  // Mammoth maps bold/italic to <strong>/<em> by default, but ignores underline
  // unless told to — this style map makes underlined runs come through as <u>.
  const { value: html } = await mammoth.convertToHtml({ buffer }, { styleMap: ["u => u"] });
  return htmlToTiptapDoc(html);
}

/**
 * Converts a constrained subset of HTML (headings, paragraphs, bold/italic/underline,
 * bullet/numbered lists) into Tiptap JSON. This is the shape mammoth's docx conversion
 * produces, so it's kept separate from docxToTiptapDoc to be testable without a binary
 * .docx fixture.
 */
export function htmlToTiptapDoc(html: string): TiptapDoc {
  const root = parseHtml(html);
  const content = htmlNodesToBlocks(root.childNodes);
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

function htmlNodesToBlocks(nodes: ParsedNode[]): TiptapNode[] {
  const out: TiptapNode[] = [];
  for (const node of nodes) {
    const mapped = htmlBlockToNode(node);
    if (mapped) out.push(mapped);
  }
  return out;
}

function htmlBlockToNode(node: ParsedNode): TiptapNode | null {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = node.text.trim();
    return text ? { type: "paragraph", content: [{ type: "text", text }] } : null;
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return null;

  const el = node as ParsedHTMLElement;
  const tag = el.tagName?.toLowerCase();

  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = Math.min(Number(tag[1]), 3);
      return { type: "heading", attrs: { level }, content: htmlInlineToNodes(el.childNodes) };
    }
    case "p":
      return { type: "paragraph", content: htmlInlineToNodes(el.childNodes) };
    case "ul":
      return { type: "bulletList", content: htmlListItems(el) };
    case "ol":
      return { type: "orderedList", attrs: { start: 1 }, content: htmlListItems(el) };
    case "br":
      return null;
    default: {
      // Unknown block element (e.g. table, image caption): flatten to a paragraph of text.
      const text = el.text?.trim();
      return text ? { type: "paragraph", content: [{ type: "text", text }] } : null;
    }
  }
}

function htmlListItems(listEl: ParsedHTMLElement): TiptapNode[] {
  return listEl.childNodes
    .filter(
      (node): node is ParsedHTMLElement =>
        node.nodeType === NodeType.ELEMENT_NODE && (node as ParsedHTMLElement).tagName?.toLowerCase() === "li"
    )
    .map((li) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: htmlInlineToNodes(li.childNodes) }],
    }));
}

function htmlInlineToNodes(nodes: ParsedNode[], marks: TiptapMark[] = []): TiptapNode[] {
  const out: TiptapNode[] = [];
  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = node.text;
      if (text) out.push({ type: "text", text, marks: marks.length ? marks : undefined });
      continue;
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) continue;

    const el = node as ParsedHTMLElement;
    const tag = el.tagName?.toLowerCase();

    if (tag === "strong" || tag === "b") {
      out.push(...htmlInlineToNodes(el.childNodes, [...marks, { type: "bold" }]));
    } else if (tag === "em" || tag === "i") {
      out.push(...htmlInlineToNodes(el.childNodes, [...marks, { type: "italic" }]));
    } else if (tag === "u") {
      out.push(...htmlInlineToNodes(el.childNodes, [...marks, { type: "underline" }]));
    } else if (tag === "br") {
      out.push({ type: "hardBreak" });
    } else {
      out.push(...htmlInlineToNodes(el.childNodes, marks));
    }
  }
  return out;
}
