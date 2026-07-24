import { prisma } from "@/lib/prisma";
import { permissionVerb, type SharePermission } from "@/lib/permissions";

/** How many notifications the bell dropdown shows at once. */
export const NOTIFICATION_PAGE_SIZE = 15;

/** How often the notification bell polls for new items (ms). */
export const NOTIFICATION_POLL_MS = 20_000;

/**
 * Records an in-app notification for the recipient when a document is shared with them.
 * Best-effort: never throws into the sharing flow (a failed notify shouldn't fail the share).
 */
export async function notifyDocumentShared(opts: {
  recipientId: string;
  actorName: string;
  documentId: string;
  documentTitle: string;
  permission: SharePermission;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: opts.recipientId,
        type: "SHARE",
        actorName: opts.actorName,
        documentId: opts.documentId,
        message: `shared “${opts.documentTitle}” with you — you can ${permissionVerb(
          opts.permission
        )} it.`,
      },
    });
  } catch (err) {
    console.warn("[notifications] failed to record share notification", err);
  }
}
