import "server-only";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { parse } from "node-html-parser";
import type { JSONContent } from "@tiptap/react";

// Formatting tags we allow in a thumbnail preview. Everything else is unwrapped
// to plain text, and every attribute is stripped, so preview HTML rendered from
// another user's shared document can't carry href/src/on*/style vectors.
const ALLOWED_TAGS = new Set([
  "h1", "h2", "h3", "h4", "p", "ul", "ol", "li",
  "strong", "em", "u", "s", "code", "pre", "blockquote", "br", "hr",
]);

/**
 * Renders a document's TipTap JSON into a small, sanitized HTML snippet suitable
 * for a card thumbnail. Returns an empty string when there's nothing to show.
 */
export function renderDocPreviewHtml(content: unknown): string {
  const doc = content as JSONContent | null | undefined;
  if (!doc || typeof doc !== "object" || !("content" in doc) || !Array.isArray(doc.content)) {
    return "";
  }

  // Only render the first handful of top-level blocks — a thumbnail never needs more.
  const trimmed: JSONContent = { ...doc, content: doc.content.slice(0, 15) };

  let html: string;
  try {
    html = generateHTML(trimmed, [StarterKit]);
  } catch {
    return "";
  }

  const root = parse(html);
  for (const el of root.querySelectorAll("*")) {
    // Strip every attribute.
    for (const name of Object.keys(el.attributes)) el.removeAttribute(name);
    // Unwrap disallowed tags to their text content.
    if (!ALLOWED_TAGS.has(el.rawTagName?.toLowerCase() ?? "")) {
      el.replaceWith(el.textContent);
    }
  }

  return root.toString().trim();
}
