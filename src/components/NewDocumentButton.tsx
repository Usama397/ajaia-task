"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export default function NewDocumentButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to create document");
      const { document } = await res.json();
      router.push(`/documents/${document.id}`);
    } catch {
      setLoading(false);
      alert("Could not create a new document. Please try again.");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="group relative flex items-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-500/25 transition-all hover:shadow-md hover:shadow-indigo-500/35 hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
          />
        </svg>
      ) : (
        <PlusIcon />
      )}
      {loading ? "Creating…" : "New document"}
    </button>
  );
}
