"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NOTIFICATION_POLL_MS } from "@/lib/notifications";

interface NotificationItem {
  id: string;
  type: string;
  actorName: string;
  message: string;
  documentId: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // Transient network error — keep last known state until the next poll.
    }
  }, []);

  // Poll for new notifications while mounted.
  useEffect(() => {
    load();
    const interval = setInterval(load, NOTIFICATION_POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  async function markAllRead() {
    if (unread === 0) return;
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      load(); // Re-sync if the update didn't land.
    }
  }

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next) markAllRead();
      return next;
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.9 32.9 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.903 32.903 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6ZM8.05 14.943a33.54 33.54 0 0 0 3.9 0 2 2 0 0 1-3.9 0Z"
            clipRule="evenodd"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 origin-top-right animate-fade-in-up overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Notifications</p>
          </div>

          {items.length === 0 ? (
            <div className="px-3.5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {items.map((n) => {
                const inner = (
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
                      {n.actorName.trim().slice(0, 1).toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {n.actorName}
                        </span>{" "}
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </div>
                );
                const className =
                  "block px-3.5 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60";
                return (
                  <li key={n.id}>
                    {n.documentId ? (
                      <Link
                        href={`/documents/${n.documentId}`}
                        className={className}
                        onClick={() => setOpen(false)}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className={className}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
