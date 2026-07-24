"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-semibold text-zinc-900">
          Ajaia Docs
        </Link>
        {session?.user && (
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span>{session.user.name ?? session.user.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
