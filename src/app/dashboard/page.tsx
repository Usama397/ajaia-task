import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderDocPreviewHtml } from "@/lib/docPreview";
import Navbar from "@/components/Navbar";
import NewDocumentButton from "@/components/NewDocumentButton";
import ImportFileButton from "@/components/ImportFileButton";
import DocumentBrowser, { type DocItem } from "@/components/DocumentBrowser";

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
      select: { id: true, title: true, updatedAt: true, contentJson: true },
    }),
    prisma.document.findMany({
      where: { shares: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        contentJson: true,
        owner: { select: { name: true, email: true } },
        shares: { where: { userId }, select: { permission: true } },
      },
    }),
  ]);

  const ownedItems: DocItem[] = owned.map((doc) => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt.toISOString(),
    updatedLabel: `Edited ${formatDate(doc.updatedAt)}`,
    previewHtml: renderDocPreviewHtml(doc.contentJson),
  }));

  const sharedItems: DocItem[] = shared.map((doc) => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt.toISOString(),
    updatedLabel: `Edited ${formatDate(doc.updatedAt)}`,
    ownerLabel: `Owner: ${doc.owner.name ?? doc.owner.email}`,
    permission: doc.shares[0]?.permission,
    previewHtml: renderDocPreviewHtml(doc.contentJson),
  }));

  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              My documents
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create, format, import, and share documents with your team.
            </p>
          </div>
          <div className="flex gap-2">
            <ImportFileButton />
            <NewDocumentButton />
          </div>
        </div>

        <div className="mt-6">
          <DocumentBrowser owned={ownedItems} shared={sharedItems} />
        </div>
      </main>
    </div>
  );
}
