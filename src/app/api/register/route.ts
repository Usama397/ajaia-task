import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, email: true, name: true },
  });

  // Convert any pending document invites addressed to this email into real shares.
  const invites = await prisma.documentInvite.findMany({ where: { email } });
  if (invites.length > 0) {
    await prisma.$transaction([
      ...invites.map((invite) =>
        prisma.documentShare.upsert({
          where: { documentId_userId: { documentId: invite.documentId, userId: user.id } },
          update: { permission: invite.permission },
          create: {
            documentId: invite.documentId,
            userId: user.id,
            permission: invite.permission,
          },
        })
      ),
      prisma.documentInvite.deleteMany({ where: { email } }),
    ]);
  }

  return NextResponse.json({ user }, { status: 201 });
}
