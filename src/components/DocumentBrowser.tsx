"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface DocItem {
  id: string;
  title: string;
  updatedAt: string; // ISO
  updatedLabel: string;
  ownerLabel?: string;
  permission?: "VIEW" | "COMMENT" | "EDIT";
  previewHtml: string;
}

type SortKey = "modified" | "name";
type View = "grid" | "list";

const permissionLabel: Record<string, string> = {
  EDIT: "Can edit",
  COMMENT: "Can comment",
  VIEW: "Can view",
};

function DocIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.914a2 2 0 0 0-.586-1.414l-3.914-3.914A2 2 0 0 0 12.086 2H4Zm3 8a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        <DocIcon className="h-6 w-6" />
      </span>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}

function PermissionBadge({ permission }: { permission: DocItem["permission"] }) {
  if (!permission) return null;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        permission === "VIEW"
          ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
      }`}
    >
      {permissionLabel[permission]}
    </span>
  );
}

function Thumbnail({ html }: { html: string }) {
  return (
    <div className="relative h-40 overflow-hidden border-b border-zinc-200 bg-white dark:border-zinc-800">
      {html ? (
        <div
          className="doc-preview absolute inset-0 p-3"
          // Sanitized server-side in renderDocPreviewHtml (attributes stripped,
          // non-formatting tags unwrapped) before it ever reaches the client.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-zinc-300">
          Empty document
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

function GridCard({ doc }: { doc: DocItem }) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/50 dark:hover:shadow-black/30"
    >
      <Thumbnail html={doc.previewHtml} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
            {doc.title}
          </h3>
          <PermissionBadge permission={doc.permission} />
        </div>
        <div className="mt-auto flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <span className="flex h-4 w-4 items-center justify-center rounded text-indigo-500 dark:text-indigo-400">
            <DocIcon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">
            {doc.ownerLabel ? `${doc.ownerLabel} · ` : ""}
            {doc.updatedLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ListRow({ doc }: { doc: DocItem }) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <DocIcon />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
            {doc.title}
          </span>
          {doc.ownerLabel && (
            <span className="block truncate text-xs text-zinc-400 dark:text-zinc-500">
              {doc.ownerLabel}
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <PermissionBadge permission={doc.permission} />
        <span className="hidden text-xs text-zinc-400 dark:text-zinc-500 sm:inline">
          {doc.updatedLabel}
        </span>
      </span>
    </Link>
  );
}

function Section({
  heading,
  docs,
  view,
  emptyMessage,
}: {
  heading: string;
  docs: DocItem[];
  view: View;
  emptyMessage: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {heading}
      </h2>
      {docs.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : view === "grid" ? (
        <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {docs.map((doc) => (
            <li key={doc.id}>
              <GridCard doc={doc} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {docs.map((doc) => (
            <li key={doc.id}>
              <ListRow doc={doc} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DocumentBrowser({ owned, shared }: { owned: DocItem[]; shared: DocItem[] }) {
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<SortKey>("modified");

  const sorter = useMemo(() => {
    return (a: DocItem, b: DocItem) =>
      sort === "name"
        ? a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        : b.updatedAt.localeCompare(a.updatedAt);
  }, [sort]);

  const sortedOwned = useMemo(() => [...owned].sort(sorter), [owned, sorter]);
  const sortedShared = useMemo(() => [...shared].sort(sorter), [shared, sorter]);

  return (
    <div>
      <div className="flex items-center justify-end gap-2">
        <label className="sr-only" htmlFor="doc-sort">
          Sort documents
        </label>
        <select
          id="doc-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-700 shadow-sm outline-none transition-colors hover:border-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600"
        >
          <option value="modified">Last modified</option>
          <option value="name">Name (A–Z)</option>
        </select>

        <div className="flex items-center rounded-lg border border-zinc-300 bg-white p-0.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            className={`rounded-md p-1.5 transition-colors ${
              view === "grid"
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3 3.75A.75.75 0 0 1 3.75 3h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 3 8.25v-4.5Zm8.25 0A.75.75 0 0 1 12 3h4.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75H12a.75.75 0 0 1-.75-.75v-4.5ZM3 11.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm8.25 0a.75.75 0 0 1 .75-.75h4.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75H12a.75.75 0 0 1-.75-.75v-4.5Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
            className={`rounded-md p-1.5 transition-colors ${
              view === "list"
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <Section
        heading="Owned by you"
        docs={sortedOwned}
        view={view}
        emptyMessage="No documents yet. Create a new one or import a .txt / .md / .docx file to get started."
      />
      <Section
        heading="Shared with you"
        docs={sortedShared}
        view={view}
        emptyMessage="Nothing here yet. Documents another person shares with you will show up in this section."
      />
    </div>
  );
}
