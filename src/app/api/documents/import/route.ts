import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fileToTiptapDoc,
  MAX_IMPORT_SIZE_BYTES,
  UnsupportedFileError,
} from "@/lib/import";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large (2MB max)" }, { status: 400 });
  }

  try {
    const text = await file.text();
    const contentJson = fileToTiptapDoc(file.name, text);
    const title = file.name.replace(/\.(md|markdown|txt)$/i, "") || "Imported document";

    const document = await prisma.document.create({
      data: { title, contentJson: contentJson as object, ownerId: session.user.id },
      select: { id: true, title: true },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof UnsupportedFileError) {
      return NextResponse.json({ error: error.message }, { status: 415 });
    }
    console.error("Import failed", error);
    return NextResponse.json({ error: "Could not import that file" }, { status: 500 });
  }
}
