import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canComment, canView } from "@/lib/permissions";
import { loadDocWithPermission } from "@/lib/document-access";
import { createCommentSchema } from "@/lib/validation";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ comments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (!canComment(permission)) {
    return NextResponse.json({ error: "You don't have permission to comment" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      documentId: id,
      authorId: session.user.id,
      body: parsed.data.body,
      quote: parsed.data.quote || null,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
