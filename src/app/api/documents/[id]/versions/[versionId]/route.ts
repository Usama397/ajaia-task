import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/permissions";
import { loadDocWithPermission } from "@/lib/document-access";

// Fetch a single version's full content (for previewing before restore).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId: id },
    select: { id: true, title: true, contentJson: true, createdAt: true },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  return NextResponse.json({ version });
}
