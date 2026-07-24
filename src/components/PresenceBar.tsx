"use client";

import { useEffect, useState } from "react";
import { PRESENCE_HEARTBEAT_MS } from "@/lib/presence";
import { avatarGradient, getInitials } from "@/lib/initials";

interface ActiveUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Real-time collaboration indicator: sends a presence heartbeat while the editor is
 * open and shows avatars of other people currently viewing/editing the document.
 * Uses short-interval polling (works on serverless; no WebSocket infrastructure needed).
 */
export default function PresenceBar({ documentId }: { documentId: string }) {
  const [users, setUsers] = useState<ActiveUser[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function heartbeat() {
      try {
        const res = await fetch(`/api/documents/${documentId}/presence`, { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUsers(data.activeUsers ?? []);
      } catch {
        // Network hiccup — keep the last known set until the next tick.
      }
    }

    heartbeat();
    const interval = setInterval(heartbeat, PRESENCE_HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [documentId]);

  if (users.length === 0) return null;

  const shown = users.slice(0, 4);
  const overflow = users.length - shown.length;

  return (
    <div className="flex items-center" title={`${users.length} other ${users.length === 1 ? "person" : "people"} here now`}>
      <div className="flex -space-x-2">
        {shown.map((user) => (
          <span
            key={user.id}
            title={user.name ?? user.email}
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
              user.id
            )} text-[10px] font-semibold text-white ring-2 ring-white dark:ring-zinc-900`}
          >
            {getInitials(user.name, user.email)}
          </span>
        ))}
        {overflow > 0 && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-600 ring-2 ring-white dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-900">
            +{overflow}
          </span>
        )}
      </div>
      <span className="ml-2 hidden items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Live
      </span>
    </div>
  );
}
