import { describe, expect, it } from "vitest";
import { canEdit, canManage, canView, getEffectivePermission } from "@/lib/permissions";

const doc = { ownerId: "owner-1" };
const shares = [
  { userId: "editor-1", permission: "EDIT" as const },
  { userId: "viewer-1", permission: "VIEW" as const },
];

describe("getEffectivePermission", () => {
  it("grants OWNER to the document owner", () => {
    expect(getEffectivePermission(doc, "owner-1", shares)).toBe("OWNER");
  });

  it("grants EDIT to a user with an edit share", () => {
    expect(getEffectivePermission(doc, "editor-1", shares)).toBe("EDIT");
  });

  it("grants VIEW to a user with a view share", () => {
    expect(getEffectivePermission(doc, "viewer-1", shares)).toBe("VIEW");
  });

  it("grants NONE to a user with no relationship to the document", () => {
    expect(getEffectivePermission(doc, "stranger-1", shares)).toBe("NONE");
  });

  it("grants NONE when there is no user", () => {
    expect(getEffectivePermission(doc, undefined, shares)).toBe("NONE");
  });
});

describe("permission checks", () => {
  it("canView is true for anyone but NONE", () => {
    expect(canView("OWNER")).toBe(true);
    expect(canView("EDIT")).toBe(true);
    expect(canView("VIEW")).toBe(true);
    expect(canView("NONE")).toBe(false);
  });

  it("canEdit is true only for OWNER and EDIT", () => {
    expect(canEdit("OWNER")).toBe(true);
    expect(canEdit("EDIT")).toBe(true);
    expect(canEdit("VIEW")).toBe(false);
    expect(canEdit("NONE")).toBe(false);
  });

  it("canManage is true only for OWNER", () => {
    expect(canManage("OWNER")).toBe(true);
    expect(canManage("EDIT")).toBe(false);
    expect(canManage("VIEW")).toBe(false);
    expect(canManage("NONE")).toBe(false);
  });
});
