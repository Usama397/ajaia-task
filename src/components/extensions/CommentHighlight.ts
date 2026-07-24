import { Mark, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/core";

/**
 * A Tiptap mark that anchors a comment to a span of text. Storing the anchor as a mark
 * (rather than absolute character offsets) means ProseMirror re-maps it automatically as
 * the surrounding text is edited, so highlights stay attached to the right passage.
 * Rendered as <span data-comment-id="…" class="comment-highlight">.
 */
export const CommentHighlight = Mark.create({
  name: "commentHighlight",
  inclusive: false,
  excludes: "",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-id"),
        renderHTML: (attrs) =>
          attrs.commentId ? { "data-comment-id": attrs.commentId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "comment-highlight" }), 0];
  },
});

/** Finds the document range covered by a given comment's highlight mark, if present. */
export function findCommentRange(
  editor: Editor,
  commentId: string
): { from: number; to: number } | null {
  let from: number | null = null;
  let to: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (
      node.isText &&
      node.marks.some((m) => m.type.name === "commentHighlight" && m.attrs.commentId === commentId)
    ) {
      if (from === null) from = pos;
      to = pos + node.nodeSize;
    }
  });
  return from !== null && to !== null ? { from, to } : null;
}
