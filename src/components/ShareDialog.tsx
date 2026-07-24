"use client";

import { useEffect, useState } from "react";

interface Share {
  id: string;
  permission: "VIEW" | "EDIT";
  user: { id: string; name: string | null; email: string };
}

export default function ShareDialog({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEW" | "EDIT">("EDIT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadShares() {
    const res = await fetch(`/api/documents/${documentId}/share`);
    if (res.ok) {
      const data = await res.json();
      setShares(data.shares);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${documentId}/share`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setShares(data.shares);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    setEmail("");
    await loadShares();
  }

  async function handleRevoke(userId: string) {
    await fetch(`/api/documents/${documentId}/share?userId=${userId}`, { method: "DELETE" });
    await loadShares();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Share document</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleShare} className="mt-4 flex gap-2">
          <input
            type="email"
            required
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as "VIEW" | "EDIT")}
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm"
          >
            <option value="EDIT">Can edit</option>
            <option value="VIEW">Can view</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            Share
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">People with access</h3>
          {shares.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">Not shared with anyone yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {shares.map((share) => (
                <li key={share.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-700">{share.user.name ?? share.user.email}</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {share.permission === "EDIT" ? "Can edit" : "Can view"}
                    </span>
                    <button
                      onClick={() => handleRevoke(share.user.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
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
