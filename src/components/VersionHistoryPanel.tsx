"use client";

import { useEffect, useState } from "react";
import { avatarGradient, getInitials } from "@/lib/initials";

interface Version {
  id: string;
  title: string;
  createdAt: string;
  createdBy: { name: string | null; email: string };
}

interface VersionHistoryPanelProps {
  documentId: string;
  canEdit: boolean;
  onRestored: () => void;
  onClose: () => void;
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );
}

export default function VersionHistoryPanel({
  documentId,
  canEdit,
  onRestored,
  onClose,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${documentId}/versions`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setVersions(data?.versions ?? []);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function restore(versionId: string) {
    if (!confirm("Restore this version? The current document will be saved to history first, so you can undo this.")) {
      return;
    }
    setRestoringId(versionId);
    const res = await fetch(`/api/documents/${documentId}/versions/${versionId}/restore`, {
      method: "POST",
    });
    setRestoringId(null);
    if (res.ok) onRestored();
  }

  return (
    <aside className="flex h-full w-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Version history</h2>
        <button
          onClick={onClose}
          aria-label="Close history"
          className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!loaded ? (
          <p className="py-8 text-center text-sm text-zinc-400">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No saved versions yet. Snapshots are captured automatically as the document is edited.
          </p>
        ) : (
          <ol className="space-y-2">
            {versions.map((version, i) => (
              <li
                key={version.id}
                className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 dark:bg-zinc-800/30"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
                      version.createdBy.email
                    )} text-[9px] font-semibold text-white`}
                  >
                    {getInitials(version.createdBy.name, version.createdBy.email)}
                  </span>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {i === 0 ? "Latest snapshot" : `Version ${versions.length - i}`}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatWhen(version.createdAt)}
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  by {version.createdBy.name ?? version.createdBy.email}
                </p>
                {canEdit && (
                  <button
                    onClick={() => restore(version.id)}
                    disabled={restoringId === version.id}
                    className="mt-2 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {restoringId === version.id ? "Restoring…" : "Restore this version"}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
