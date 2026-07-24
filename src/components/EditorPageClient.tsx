"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { JSONContent } from "@tiptap/react";
import ShareDialog from "@/components/ShareDialog";
import PresenceBar from "@/components/PresenceBar";
import ExportMenu from "@/components/ExportMenu";
import CommentsPanel from "@/components/CommentsPanel";
import VersionHistoryPanel from "@/components/VersionHistoryPanel";
import { canComment as canCommentFn, canEdit as canEditFn, canManage as canManageFn, type Permission } from "@/lib/permissions";

const DocEditor = dynamic(() => import("@/components/DocEditor"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto my-6 w-full max-w-4xl px-4">
      <div className="h-[60vh] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  ),
});

type SaveStatus = "saved" | "saving" | "error";
type SidePanel = "comments" | "history" | null;

interface EditorPageClientProps {
  documentId: string;
  initialTitle: string;
  initialContent: JSONContent;
  permission: Permission;
  currentUserId: string;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06L7.47 10.53a.75.75 0 0 1 0-1.06l4.26-4.24a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.474l6.733-3.367A2.5 2.5 0 0 1 13 4.5Z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M10 3c-4.31 0-8 2.66-8 6.25 0 1.78.9 3.37 2.36 4.5-.09.86-.42 1.66-.95 2.32a.5.5 0 0 0 .48.82 6.9 6.9 0 0 0 3.2-1.44c.9.25 1.87.4 2.91.4 4.31 0 8-2.66 8-6.6C18 5.66 14.31 3 10 3Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M10 3a7 7 0 1 0 6.32 4a.75.75 0 1 0-1.35.65A5.5 5.5 0 1 1 10 4.5c.28 0 .5.22.5.5v3.5l2.6 1.5a.75.75 0 1 0 .75-1.3L11.5 7.9V5a1.5 1.5 0 0 0-1.5-1.5V3Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path
        fillRule="evenodd"
        d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.147.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const config = {
    saved: { dot: "bg-emerald-500", text: "text-zinc-400 dark:text-zinc-500", label: "Saved" },
    saving: { dot: "bg-indigo-500 animate-pulse", text: "text-zinc-500 dark:text-zinc-400", label: "Saving…" },
    error: { dot: "bg-red-500", text: "text-red-500 dark:text-red-400", label: "Save failed" },
  }[status];

  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function PanelToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-400"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function EditorPageClient({
  documentId,
  initialTitle,
  initialContent,
  permission,
  currentUserId,
}: EditorPageClientProps) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [shareOpen, setShareOpen] = useState(false);
  const [panel, setPanel] = useState<SidePanel>(null);
  const [selectedText, setSelectedText] = useState("");
  const titleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canEdit = canEditFn(permission);
  const canManage = canManageFn(permission);
  const canComment = canCommentFn(permission);

  async function saveTitle(next: string) {
    if (!canManage) return;
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setStatus("error");
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setTitle(next);
    if (titleTimeout.current) clearTimeout(titleTimeout.current);
    titleTimeout.current = setTimeout(() => saveTitle(next), 800);
  }

  async function handleContentSave(content: JSONContent) {
    setStatus("saving");
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: content }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  function togglePanel(next: Exclude<SidePanel, null>) {
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-100 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <BackIcon />
              Docs
            </Link>
            {canManage ? (
              <input
                value={title}
                onChange={handleTitleChange}
                aria-label="Document title"
                className="-mx-2 min-w-0 flex-1 truncate rounded-md border-none bg-transparent px-2 py-1 text-lg font-semibold text-zinc-900 outline-none transition-colors hover:bg-zinc-100 focus:bg-zinc-100 focus:ring-2 focus:ring-indigo-500/20 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
              />
            ) : (
              <span className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </span>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <PresenceBar documentId={documentId} />
            {canEdit && <SaveStatusIndicator status={status} />}
            {!canEdit && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <EyeIcon />
                {canComment ? "Comment only" : "View only"}
              </span>
            )}

            <PanelToggle active={panel === "comments"} onClick={() => togglePanel("comments")} label="Comments">
              <CommentIcon />
            </PanelToggle>
            <PanelToggle active={panel === "history"} onClick={() => togglePanel("history")} label="History">
              <HistoryIcon />
            </PanelToggle>
            <ExportMenu documentId={documentId} />

            {canManage && (
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/25 transition-all hover:shadow-md hover:shadow-indigo-500/35 hover:brightness-110 active:scale-[0.97]"
              >
                <ShareIcon />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1">
        <div className="min-w-0 flex-1">
          <DocEditor
            initialContent={initialContent}
            editable={canEdit}
            onSave={handleContentSave}
            onSelectionChange={setSelectedText}
          />
        </div>

        {panel === "comments" && (
          <div className="w-full max-w-sm shrink-0 sm:w-80">
            <div className="sticky top-[57px] h-[calc(100vh-57px)]">
              <CommentsPanel
                documentId={documentId}
                canComment={canComment}
                canManage={canManage}
                currentUserId={currentUserId}
                selectedText={selectedText}
                onClose={() => setPanel(null)}
              />
            </div>
          </div>
        )}

        {panel === "history" && (
          <div className="w-full max-w-sm shrink-0 sm:w-80">
            <div className="sticky top-[57px] h-[calc(100vh-57px)]">
              <VersionHistoryPanel
                documentId={documentId}
                canEdit={canEdit}
                onRestored={() => {
                  // Full reload so the Tiptap editor re-initializes from the restored content.
                  window.location.reload();
                }}
                onClose={() => setPanel(null)}
              />
            </div>
          </div>
        )}
      </div>

      {shareOpen && <ShareDialog documentId={documentId} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
