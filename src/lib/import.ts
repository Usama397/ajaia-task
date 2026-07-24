import { marked } from "marked";
import type { Tokens } from "marked";

export type TiptapMark = { type: string };
export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
  text?: string;
};
export type TiptapDoc = { type: "doc"; content: TiptapNode[] };

export const SUPPORTED_IMPORT_EXTENSIONS = ["txt", "md", "markdown"] as const;
export const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export class UnsupportedFileError extends Error {}

export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/** Converts an uploaded .txt or .md file's text content into a Tiptap document. */
export function fileToTiptapDoc(filename: string, text: string): TiptapDoc {
  const ext = getFileExtension(filename);
  if (ext === "md" || ext === "markdown") {
    return markdownToTiptapDoc(text);
  }
  if (ext === "txt") {
    return plainTextToTiptapDoc(text);
  }
  throw new UnsupportedFileError(
    `Unsupported file type ".${ext || "unknown"}". Only .txt and .md files can be imported.`
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
