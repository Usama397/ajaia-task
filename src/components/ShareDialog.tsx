"use client";

import { useEffect, useState } from "react";

interface Share {
  id: string;
  permission: "VIEW" | "EDIT";
  user: { id: string; name: string | null; email: string };
}

interface Invite {
  id: string;
  email: string;
  permission: "VIEW" | "EDIT";
}

function getInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
  }
  return (email?.trim() ?? "?").slice(0, 2).toUpperCase();
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

export default function ShareDialog({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [shares, setShares] = useState<Share[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEW" | "EDIT">("EDIT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadShares() {
    const res = await fetch(`/api/documents/${documentId}/share`);
    if (res.ok) {
      const data = await res.json();
      setShares(data.shares ?? []);
      setInvites(data.invites ?? []);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${documentId}/share`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setShares(data.shares ?? []);
          setInvites(data.invites ?? []);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const res = await fetch(`/api/documents/${documentId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, permission }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not share document");
      return;
    }
    if (data.invite) {
      setNotice(
        data.emailSent
          ? `Invitation emailed to ${data.invite.email}. They'll get access as soon as they sign up.`
          : `${data.invite.email} isn't on Ajaia yet — invite saved and access will be granted when they sign up. (Email delivery isn't configured, so no email was sent.)`
      );
    } else if (data.share && !data.emailSent) {
      setNotice(`Shared with ${data.share.user.email}. (Notification email not sent — email delivery isn't configured.)`);
    }
    setEmail("");
    await loadShares();
  }

  async function handleRevoke(userId: string) {
    await fetch(`/api/documents/${documentId}/share?userId=${userId}`, { method: "DELETE" });
    await loadShares();
  }

  async function handleRevokeInvite(inviteId: string) {
    await fetch(`/api/documents/${documentId}/share?inviteId=${inviteId}`, { method: "DELETE" });
    await loadShares();
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-zinc-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-fade-in-up rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Share document</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleShare} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/15"
          />
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as "VIEW" | "EDIT")}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-700 shadow-sm outline-none transition-colors hover:border-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:border-zinc-600"
          >
            <option value="EDIT">Can edit</option>
            <option value="VIEW">Can view</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-500/25 transition-all hover:shadow-md hover:shadow-indigo-500/35 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sharing…" : "Share"}
          </button>
        </form>
        {error && (
          <p className="mt-2 animate-shake text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {notice && (
          <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            {notice}
          </p>
        )}

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            People with access
          </h3>
          {shares.length === 0 && invites.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">Not shared with anyone yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-semibold text-white">
                      {getInitials(share.user.name, share.user.email)}
                    </span>
                    <span className="truncate text-zinc-700 dark:text-zinc-300">
                      {share.user.name ?? share.user.email}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {share.permission === "EDIT" ? "Can edit" : "Can view"}
                    </span>
                    <button
                      onClick={() => handleRevoke(share.user.id)}
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}

              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-[10px] font-semibold text-zinc-400 dark:border-zinc-600 dark:text-zinc-500">
                      {getInitials(null, invite.email)}
                    </span>
                    <span className="truncate text-zinc-500 dark:text-zinc-400">{invite.email}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      Pending
                    </span>
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Cancel
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
