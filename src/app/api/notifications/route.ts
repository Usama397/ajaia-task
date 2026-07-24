import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_PAGE_SIZE } from "@/lib/notifications";

// List the current user's notifications plus the unread count for the badge.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: NOTIFICATION_PAGE_SIZE,
      select: {
        id: true,
        type: true,
        actorName: true,
        message: true,
        documentId: true,
        read: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

// Mark notifications read. Body: { ids?: string[] } — omit ids to mark all read.
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string")
    : null;

  await prisma.notification.updateMany({
    where: { userId, read: false, ...(ids ? { id: { in: ids } } : {}) },
    data: { read: true },
  });

  const unreadCount = await prisma.notification.count({ where: { userId, read: false } });
  return NextResponse.json({ ok: true, unreadCount });
}
