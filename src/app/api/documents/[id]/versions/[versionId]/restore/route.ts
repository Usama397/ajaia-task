import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/permissions";
import { loadDocWithPermission } from "@/lib/document-access";

// Restore a document to a previous version. The current state is snapshotted first,
// so a restore is itself reversible.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!canEdit(permission)) {
    return NextResponse.json({ error: "You need edit access to restore a version" }, { status: 403 });
  }

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId: id },
    select: { contentJson: true, title: true },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const [, updated] = await prisma.$transaction([
    // Snapshot the current (pre-restore) state so the restore can be undone.
    prisma.documentVersion.create({
      data: {
        documentId: id,
        title: document.title,
        contentJson: document.contentJson as object,
        createdById: session.user.id,
      },
    }),
    prisma.document.update({
      where: { id },
      data: { contentJson: version.contentJson as object },
      select: { id: true, title: true, contentJson: true, updatedAt: true },
    }),
  ]);

  return NextResponse.json({ document: updated });
}
