export type Permission = "OWNER" | "EDIT" | "VIEW" | "NONE";

export interface DocLike {
  ownerId: string;
}

export interface ShareLike {
  userId: string;
  permission: "VIEW" | "EDIT";
}

/** Resolves what a user is allowed to do with a document: owner beats any share record. */
export function getEffectivePermission(
  doc: DocLike,
  userId: string | undefined | null,
  shares: ShareLike[]
): Permission {
  if (!userId) return "NONE";
  if (doc.ownerId === userId) return "OWNER";
  const share = shares.find((s) => s.userId === userId);
  return share ? share.permission : "NONE";
}

export function canView(permission: Permission): boolean {
  return permission !== "NONE";
}

export function canEdit(permission: Permission): boolean {
  return permission === "OWNER" || permission === "EDIT";
}

/** Rename, delete, and managing shares are owner-only actions. */
export function canManage(permission: Permission): boolean {
  return permission === "OWNER";
}
