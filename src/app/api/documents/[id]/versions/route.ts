import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/permissions";
import { loadDocWithPermission } from "@/lib/document-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      createdBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ versions });
}
