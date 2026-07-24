"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { JSONContent } from "@tiptap/react";
import ShareDialog from "@/components/ShareDialog";

const DocEditor = dynamic(() => import("@/components/DocEditor"), {
  ssr: false,
  loading: () => <div className="flex-1 px-8 py-6 text-sm text-zinc-400">Loading editor…</div>,
});

type Permission = "OWNER" | "EDIT" | "VIEW";
type SaveStatus = "saved" | "saving" | "error";

interface EditorPageClientProps {
  documentId: string;
  initialTitle: string;
  initialContent: JSONContent;
  permission: Permission;
}

export default function EditorPageClient({
  documentId,
  initialTitle,
  initialContent,
  permission,
}: EditorPageClientProps) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [shareOpen, setShareOpen] = useState(false);
  const titleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canEdit = permission === "OWNER" || permission === "EDIT";
  const canManage = permission === "OWNER";

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

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900">
              ← Docs
            </Link>
            {canManage ? (
              <input
                value={title}
                onChange={handleTitleChange}
                className="min-w-0 flex-1 truncate border-none bg-transparent text-lg font-semibold text-zinc-900 focus:outline-none"
              />
            ) : (
              <span className="truncate text-lg font-semibold text-zinc-900">{title}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {canEdit && (
              <span className="text-xs text-zinc-400">
                {status === "saving" ? "Saving…" : status === "error" ? "Save failed" : "Saved"}
              </span>
            )}
            {!canEdit && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                View only
              </span>
            )}
            {canManage && (
              <button
                onClick={() => setShareOpen(true)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Share
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1">
        <DocEditor initialContent={initialContent} editable={canEdit} onSave={handleContentSave} />
      </div>

      {shareOpen && <ShareDialog documentId={documentId} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
