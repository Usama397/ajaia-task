import { prisma } from "@/lib/prisma";
import { getEffectivePermission, type Permission } from "@/lib/permissions";

/** Loads a document with the requesting user's effective permission. */
export async function loadDocWithPermission(
  documentId: string,
  userId: string
): Promise<{ document: Awaited<ReturnType<typeof findDoc>>; permission: Permission }> {
  const document = await findDoc(documentId);
  if (!document) return { document: null, permission: "NONE" };
  const permission = getEffectivePermission(document, userId, document.shares);
  return { document, permission };
}

function findDoc(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: true },
  });
}
