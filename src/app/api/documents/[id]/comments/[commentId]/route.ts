import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canComment, canManage, canView } from "@/lib/permissions";
import { loadDocWithPermission } from "@/lib/document-access";
import { updateCommentSchema } from "@/lib/validation";

// Resolve / reopen a comment. Anyone who can comment may toggle resolution.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (!canComment(permission)) {
    return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.comment.findFirst({ where: { id: commentId, documentId: id } });
  if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: { resolved: parsed.data.resolved },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ comment });
}

// Delete a comment. The author or the document owner may delete.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const existing = await prisma.comment.findFirst({ where: { id: commentId, documentId: id } });
  if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const isAuthor = existing.authorId === session.user.id;
  if (!isAuthor && !canManage(permission)) {
    return NextResponse.json(
      { error: "Only the comment author or document owner can delete this comment" },
      { status: 403 }
    );
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
