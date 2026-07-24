"use client";

import { useEffect, useRef, useState } from "react";

export default function ExportMenu({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  function download(format: "md" | "html") {
    window.location.href = `/api/documents/${documentId}/export?format=${format}`;
    setOpen(false);
  }

  function printPdf() {
    // Opens a clean, print-optimized page that auto-triggers the browser print dialog
    // (Save as PDF). Dependency-free and works everywhere.
    window.open(`/api/documents/${documentId}/export?format=pdf`, "_blank", "noopener");
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M10 3a.75.75 0 0 1 .75.75v6.638l1.96-2.158a.75.75 0 1 1 1.08 1.04l-3.25 3.5a.75.75 0 0 1-1.08 0l-3.25-3.5a.75.75 0 1 1 1.08-1.04l1.96 2.158V3.75A.75.75 0 0 1 10 3ZM3.5 12.75a.75.75 0 0 1 .75.75v2.5c0 .138.112.25.25.25h11a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 15.5 17.5h-11A1.75 1.75 0 0 1 2.75 16v-2.5a.75.75 0 0 1 .75-.75Z"
            clipRule="evenodd"
          />
        </svg>
        Export
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-52 origin-top-right animate-fade-in-up rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30"
        >
          <button
            role="menuitem"
            onClick={() => download("md")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Markdown (.md)
          </button>
          <button
            role="menuitem"
            onClick={printPdf}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            PDF (via print)
          </button>
          <button
            role="menuitem"
            onClick={() => download("html")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            HTML (.html)
          </button>
        </div>
      )}
    </div>
  );
}
