import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateDocumentSchema } from "@/lib/validation";
import { canEdit, canManage, canView } from "@/lib/permissions";
import { loadDocWithPermission } from "@/lib/document-access";
import { shouldSnapshot } from "@/lib/versioning";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({
    document: {
      id: document.id,
      title: document.title,
      contentJson: document.contentJson,
      updatedAt: document.updatedAt,
    },
    permission,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const wantsTitleChange = parsed.data.title !== undefined;
  const wantsContentChange = parsed.data.contentJson !== undefined;

  if (wantsTitleChange && !canManage(permission)) {
    return NextResponse.json({ error: "Only the owner can rename this document" }, { status: 403 });
  }
  if (wantsContentChange && !canEdit(permission)) {
    return NextResponse.json({ error: "You only have view access to this document" }, { status: 403 });
  }

  // Snapshot the pre-edit state into version history (throttled) before overwriting content.
  if (wantsContentChange) {
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (shouldSnapshot(lastVersion?.createdAt ?? null)) {
      await prisma.documentVersion.create({
        data: {
          documentId: id,
          title: document.title,
          contentJson: document.contentJson as object,
          createdById: session.user.id,
        },
      });
    }
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      ...(wantsTitleChange ? { title: parsed.data.title!.trim() } : {}),
      ...(wantsContentChange ? { contentJson: parsed.data.contentJson as object } : {}),
    },
    select: { id: true, title: true, updatedAt: true },
  });

  return NextResponse.json({ document: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (!canManage(permission)) {
    return NextResponse.json({ error: "Only the owner can delete this document" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
