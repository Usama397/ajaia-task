"use client";

import { useEffect, useState } from "react";
import { avatarGradient, getInitials } from "@/lib/initials";

interface Comment {
  id: string;
  body: string;
  quote: string | null;
  resolved: boolean;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
}

interface CommentsPanelProps {
  documentId: string;
  canComment: boolean;
  canManage: boolean;
  currentUserId: string;
  hasSelection: boolean;
  activeCommentId: string | null;
  onAnchorComment: (commentId: string) => void;
  onRemoveAnchor: (commentId: string) => void;
  onFocusComment: (commentId: string) => void;
  onClose: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CommentsPanel({
  documentId,
  canComment,
  canManage,
  currentUserId,
  hasSelection,
  activeCommentId,
  onAnchorComment,
  onRemoveAnchor,
  onFocusComment,
  onClose,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  async function loadComments() {
    const res = await fetch(`/api/documents/${documentId}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments ?? []);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${documentId}/comments`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setComments(data.comments ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/documents/${documentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      // Anchor this comment to the currently-selected passage (highlight it in the doc).
      if (data.comment?.id) onAnchorComment(data.comment.id);
      setBody("");
      await loadComments();
    }
  }

  async function toggleResolved(comment: Comment) {
    await fetch(`/api/documents/${documentId}/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !comment.resolved }),
    });
    await loadComments();
  }

  async function deleteComment(comment: Comment) {
    await fetch(`/api/documents/${documentId}/comments/${comment.id}`, { method: "DELETE" });
    onRemoveAnchor(comment.id);
    await loadComments();
  }

  const visible = comments.filter((c) => (showResolved ? true : !c.resolved));
  const openCount = comments.filter((c) => !c.resolved).length;

  return (
    <aside className="flex h-full w-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Comments {openCount > 0 && <span className="text-zinc-400">({openCount})</span>}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close comments"
          className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {comments.length === 0 ? "No comments yet." : "No open comments."}
          </p>
        ) : (
          visible.map((comment) => {
            const canDelete = comment.author.id === currentUserId || canManage;
            const isActive = comment.id === activeCommentId;
            return (
              <div
                key={comment.id}
                onClick={() => onFocusComment(comment.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onFocusComment(comment.id);
                }}
                className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                  comment.resolved
                    ? "border-zinc-200 bg-zinc-50/60 opacity-70 dark:border-zinc-800 dark:bg-zinc-800/30"
                    : isActive
                      ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
                      comment.author.id
                    )} text-[9px] font-semibold text-white`}
                  >
                    {getInitials(comment.author.name, comment.author.email)}
                  </span>
                  <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {comment.author.name ?? comment.author.email}
                  </span>
                  <span className="ml-auto text-[11px] text-zinc-400">{timeAgo(comment.createdAt)}</span>
                </div>

                <p className="mt-1.5 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                  {comment.body}
                </p>

                <div className="mt-2 flex items-center gap-3 text-xs">
                  {canComment && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleResolved(comment);
                      }}
                      className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {comment.resolved ? "Reopen" : "Resolve"}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteComment(comment);
                      }}
                      className="font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {comments.some((c) => c.resolved) && (
        <button
          onClick={() => setShowResolved((v) => !v)}
          className="border-t border-zinc-200 px-4 py-2 text-left text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {showResolved ? "Hide resolved" : "Show resolved"}
        </button>
      )}

      {canComment ? (
        <form onSubmit={handleSubmit} className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          {hasSelection ? (
            <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
              Commenting on the highlighted text
            </p>
          ) : (
            <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
              Tip: select text in the document first to attach your comment to it.
            </p>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={loading || !body.trim()}
            className="mt-2 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Posting…" : "Comment"}
          </button>
        </form>
      ) : (
        <p className="border-t border-zinc-200 p-3 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          You have view-only access, so you can read comments but not add them.
        </p>
      )}
    </aside>
  );
}
