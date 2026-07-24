import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView, getEffectivePermission } from "@/lib/permissions";
import EditorPageClient from "@/components/EditorPageClient";
import type { JSONContent } from "@tiptap/react";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const document = await prisma.document.findUnique({
    where: { id },
    include: { shares: true },
  });
  if (!document) notFound();

  const permission = getEffectivePermission(document, session.user.id, document.shares);
  if (!canView(permission)) notFound();

  return (
    <EditorPageClient
      documentId={document.id}
      initialTitle={document.title}
      initialContent={document.contentJson as JSONContent}
      permission={permission === "NONE" ? "VIEW" : permission}
    />
  );
}
