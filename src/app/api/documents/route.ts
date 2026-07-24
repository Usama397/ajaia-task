import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDocumentSchema } from "@/lib/validation";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [owned, shared] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
    }),
    prisma.document.findMany({
      where: { shares: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        owner: { select: { name: true, email: true } },
        shares: { where: { userId }, select: { permission: true } },
      },
    }),
  ]);

  return NextResponse.json({
    owned,
    shared: shared.map((doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      owner: doc.owner,
      permission: doc.shares[0]?.permission ?? "VIEW",
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const document = await prisma.document.create({
    data: {
      title: parsed.data.title?.trim() || "Untitled document",
      contentJson: EMPTY_DOC,
      ownerId: session.user.id,
    },
    select: { id: true, title: true },
  });

  return NextResponse.json({ document }, { status: 201 });
}
