import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shareDocumentSchema } from "@/lib/validation";
import { canManage, getEffectivePermission } from "@/lib/permissions";

async function requireOwner(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: true },
  });
  if (!document) return { document: null, ok: false };
  const permission = getEffectivePermission(document, userId, document.shares);
  return { document, ok: canManage(permission) };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, ok } = await requireOwner(id, session.user.id);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!ok) return NextResponse.json({ error: "Only the owner can view sharing" }, { status: 403 });

  const shares = await prisma.documentShare.findMany({
    where: { documentId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ shares });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, ok } = await requireOwner(id, session.user.id);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!ok) return NextResponse.json({ error: "Only the owner can share this document" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = shareDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!targetUser) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }
  if (targetUser.id === session.user.id) {
    return NextResponse.json({ error: "You already own this document" }, { status: 400 });
  }

  const share = await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: id, userId: targetUser.id } },
    update: { permission: parsed.data.permission },
    create: { documentId: id, userId: targetUser.id, permission: parsed.data.permission },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ share }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, ok } = await requireOwner(id, session.user.id);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!ok) return NextResponse.json({ error: "Only the owner can revoke access" }, { status: 403 });

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  await prisma.documentShare.deleteMany({ where: { documentId: id, userId } });
  return NextResponse.json({ ok: true });
}
