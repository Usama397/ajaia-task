"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
    >
      {loading ? "Creating…" : "New document"}
    </button>
  );
}
