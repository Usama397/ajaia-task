import type { TiptapDoc, TiptapNode } from "@/lib/import";

/**
 * Converts a Tiptap/ProseMirror JSON document into Markdown. This is the inverse of the
 * import path (see lib/import.ts) and covers the same feature set the editor produces:
 * headings, bold/italic/underline/strike/code marks, and bullet/numbered lists.
 */
export function tiptapToMarkdown(doc: TiptapDoc | { type: string; content?: TiptapNode[] }): string {
  const blocks = (doc.content ?? []).map((node) => blockToMarkdown(node)).filter((s) => s !== null);
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function blockToMarkdown(node: TiptapNode, depth = 0): string | null {
  switch (node.type) {
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
      return `${"#".repeat(level)} ${inlineToMarkdown(node.content ?? [])}`;
    }
    case "paragraph":
      return inlineToMarkdown(node.content ?? []);
    case "bulletList":
      return listToMarkdown(node, depth, false);
    case "orderedList":
      return listToMarkdown(node, depth, true);
    case "blockquote":
      return (node.content ?? [])
        .map((child) => `> ${blockToMarkdown(child, depth) ?? ""}`)
        .join("\n");
    case "codeBlock":
      return "```\n" + (node.content ?? []).map((c) => c.text ?? "").join("") + "\n```";
    case "horizontalRule":
      return "---";
    default:
      return node.content ? inlineToMarkdown(node.content) : null;
  }
}

function listToMarkdown(list: TiptapNode, depth: number, ordered: boolean): string {
  const indent = "  ".repeat(depth);
  const items = (list.content ?? []).map((item, i) => {
    const marker = ordered ? `${i + 1}.` : "-";
    const parts = (item.content ?? []).map((child, idx) => {
      if (child.type === "bulletList" || child.type === "orderedList") {
        return "\n" + listToMarkdown(child, depth + 1, child.type === "orderedList");
      }
      const text = blockToMarkdown(child, depth) ?? "";
      return idx === 0 ? text : `\n${indent}  ${text}`;
    });
    return `${indent}${marker} ${parts.join("")}`;
  });
  return items.join("\n");
}

function inlineToMarkdown(nodes: TiptapNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      if (node.type !== "text" || !node.text) return "";

      let text = node.text;
      const marks = node.marks?.map((m) => m.type) ?? [];
      // Apply innermost-first so nesting reads correctly, e.g. ***bolditalic***.
      if (marks.includes("code")) text = `\`${text}\``;
      if (marks.includes("strike")) text = `~~${text}~~`;
      if (marks.includes("bold")) text = `**${text}**`;
      if (marks.includes("italic")) text = `*${text}*`;
      if (marks.includes("underline")) text = `<u>${text}</u>`;
      return text;
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Serializes a Tiptap document to a fragment of HTML (used for the print-to-PDF path). */
export function tiptapToHtml(doc: TiptapDoc | { type: string; content?: TiptapNode[] }): string {
  return (doc.content ?? []).map((node) => blockToHtml(node)).join("");
}

function blockToHtml(node: TiptapNode): string {
  switch (node.type) {
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
      return `<h${level}>${inlineToHtml(node.content ?? [])}</h${level}>`;
    }
    case "paragraph":
      return `<p>${inlineToHtml(node.content ?? [])}</p>`;
    case "bulletList":
      return `<ul>${(node.content ?? []).map(blockToHtml).join("")}</ul>`;
    case "orderedList":
      return `<ol>${(node.content ?? []).map(blockToHtml).join("")}</ol>`;
    case "listItem":
      return `<li>${(node.content ?? []).map(blockToHtml).join("")}</li>`;
    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(blockToHtml).join("")}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${escapeHtml((node.content ?? []).map((c) => c.text ?? "").join(""))}</code></pre>`;
    case "horizontalRule":
      return "<hr />";
    default:
      return node.content ? inlineToHtml(node.content) : "";
  }
}

function inlineToHtml(nodes: TiptapNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "<br />";
      if (node.type !== "text" || !node.text) return "";
      let html = escapeHtml(node.text);
      const marks = node.marks?.map((m) => m.type) ?? [];
      if (marks.includes("code")) html = `<code>${html}</code>`;
      if (marks.includes("strike")) html = `<s>${html}</s>`;
      if (marks.includes("underline")) html = `<u>${html}</u>`;
      if (marks.includes("italic")) html = `<em>${html}</em>`;
      if (marks.includes("bold")) html = `<strong>${html}</strong>`;
      return html;
    })
    .join("");
}

/** Wraps serialized document HTML in a clean, print-optimized standalone page. */
export function buildPrintableHtml(title: string, bodyHtml: string, autoPrint: boolean): string {
  const safeTitle = escapeHtml(title);
  const printScript = autoPrint
    ? "<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>"
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 3rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.65; }
  h1 { font-size: 2rem; margin: 1.4rem 0 0.6rem; }
  h2 { font-size: 1.5rem; margin: 1.2rem 0 0.5rem; }
  h3 { font-size: 1.25rem; margin: 1rem 0 0.5rem; }
  p { margin: 0.6rem 0; }
  ul, ol { padding-left: 1.6rem; margin: 0.6rem 0; }
  blockquote { border-left: 3px solid #ccc; margin: 0.8rem 0; padding-left: 1rem; color: #555; }
  code { background: #f4f4f5; padding: 0.1em 0.3em; border-radius: 3px; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.9em; }
  pre { background: #f4f4f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
  @media print { body { margin: 0; max-width: none; } }
</style>
</head>
<body>
<h1>${safeTitle}</h1>
${bodyHtml}
${printScript}
</body>
</html>`;
}
