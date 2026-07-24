import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/permissions";
import { loadDocWithPermission } from "@/lib/document-access";
import { activeSince } from "@/lib/presence";

async function activeUsers(documentId: string, excludeUserId: string) {
  const rows = await prisma.presence.findMany({
    where: { documentId, lastSeenAt: { gte: activeSince() } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { lastSeenAt: "desc" },
  });
  return rows
    .filter((row) => row.user.id !== excludeUserId)
    .map((row) => ({ id: row.user.id, name: row.user.name, email: row.user.email }));
}

// Heartbeat: mark the current user as present, and return everyone else active now.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.presence.upsert({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
    update: { lastSeenAt: new Date() },
    create: { documentId: id, userId: session.user.id },
  });

  return NextResponse.json({ activeUsers: await activeUsers(id, session.user.id) });
}

// Passive read of who's active (used on first load before the first heartbeat).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ activeUsers: await activeUsers(id, session.user.id) });
}
