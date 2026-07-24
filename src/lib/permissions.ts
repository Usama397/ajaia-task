export type SharePermission = "VIEW" | "COMMENT" | "EDIT";
export type Permission = "OWNER" | "EDIT" | "COMMENT" | "VIEW" | "NONE";

export interface DocLike {
  ownerId: string;
}

export interface ShareLike {
  userId: string;
  permission: SharePermission;
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

/** Adding comments requires COMMENT access or higher (owner and editors can also comment). */
export function canComment(permission: Permission): boolean {
  return permission === "OWNER" || permission === "EDIT" || permission === "COMMENT";
}

export function canEdit(permission: Permission): boolean {
  return permission === "OWNER" || permission === "EDIT";
}

/** Rename, delete, sharing, and restoring versions are owner-only actions. */
export function canManage(permission: Permission): boolean {
  return permission === "OWNER";
}

const PERMISSION_LABELS: Record<SharePermission, string> = {
  VIEW: "Can view",
  COMMENT: "Can comment",
  EDIT: "Can edit",
};

export function permissionLabel(permission: SharePermission): string {
  return PERMISSION_LABELS[permission];
}
