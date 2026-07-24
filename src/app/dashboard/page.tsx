import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import NewDocumentButton from "@/components/NewDocumentButton";
import ImportFileButton from "@/components/ImportFileButton";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const [owned, shared] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.document.findMany({
      where: { shares: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        owner: { select: { name: true, email: true } },
        shares: { where: { userId }, select: { permission: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">My documents</h1>
          <div className="flex gap-2">
            <ImportFileButton />
            <NewDocumentButton />
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Owned by you</h2>
          {owned.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No documents yet. Create a new one or import a .txt / .md file to get started.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
              {owned.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/documents/${doc.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                  >
                    <span className="font-medium text-zinc-900">{doc.title}</span>
                    <span className="text-xs text-zinc-400">Edited {formatDate(doc.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Shared with you</h2>
          {shared.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No documents have been shared with you yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
              {shared.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/documents/${doc.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                  >
                    <span className="font-medium text-zinc-900">{doc.title}</span>
                    <span className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>Owner: {doc.owner.name ?? doc.owner.email}</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                        {doc.shares[0]?.permission === "EDIT" ? "Can edit" : "Can view"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
