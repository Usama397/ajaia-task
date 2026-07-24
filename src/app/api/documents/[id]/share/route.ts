import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shareDocumentSchema } from "@/lib/validation";
import { canManage, getEffectivePermission } from "@/lib/permissions";
import { sendShareInviteEmail, sendShareNotificationEmail } from "@/lib/email";
import { notifyDocumentShared } from "@/lib/notifications";

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

  const [shares, invites] = await Promise.all([
    prisma.documentShare.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.documentInvite.findMany({
      where: { documentId: id },
      select: { id: true, email: true, permission: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ shares, invites });
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

  const { email, permission } = parsed.data;
  const inviterName = session.user.name ?? session.user.email ?? "Someone";

  const targetUser = await prisma.user.findUnique({ where: { email } });

  if (targetUser) {
    if (targetUser.id === session.user.id) {
      return NextResponse.json({ error: "You already own this document" }, { status: 400 });
    }

    const share = await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: id, userId: targetUser.id } },
      update: { permission },
      create: { documentId: id, userId: targetUser.id, permission },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Notify the recipient both in-app and by email.
    await notifyDocumentShared({
      recipientId: targetUser.id,
      actorName: inviterName,
      documentId: id,
      documentTitle: document.title,
      permission,
    });

    const { sent } = await sendShareNotificationEmail({
      to: email,
      inviterName,
      documentTitle: document.title,
      permission,
      documentId: id,
    }).catch(() => ({ sent: false }));

    return NextResponse.json({ share, emailSent: sent }, { status: 201 });
  }

  // Not a registered user yet — create a pending invite and email them.
  const invite = await prisma.documentInvite.upsert({
    where: { documentId_email: { documentId: id, email } },
    update: { permission },
    create: { documentId: id, email, permission, invitedById: session.user.id },
    select: { id: true, email: true, permission: true, createdAt: true, token: true },
  });

  const { sent } = await sendShareInviteEmail({
    to: email,
    inviterName,
    documentTitle: document.title,
    permission,
    token: invite.token,
  }).catch(() => ({ sent: false }));

  const { token: _token, ...invitePublic } = invite;
  return NextResponse.json({ invite: invitePublic, emailSent: sent }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, ok } = await requireOwner(id, session.user.id);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!ok) return NextResponse.json({ error: "Only the owner can revoke access" }, { status: 403 });

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const inviteId = url.searchParams.get("inviteId");

  if (inviteId) {
    await prisma.documentInvite.deleteMany({ where: { documentId: id, id: inviteId } });
    return NextResponse.json({ ok: true });
  }

  if (!userId) return NextResponse.json({ error: "userId or inviteId is required" }, { status: 400 });

  await prisma.documentShare.deleteMany({ where: { documentId: id, userId } });
  return NextResponse.json({ ok: true });
}
