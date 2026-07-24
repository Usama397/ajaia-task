/** A user is considered "active" on a document if they sent a heartbeat within this window. */
export const PRESENCE_ACTIVE_WINDOW_MS = 30_000; // 30 seconds

/** Clients should send a heartbeat at least twice per active window to stay online. */
export const PRESENCE_HEARTBEAT_MS = 10_000; // 10 seconds

export function activeSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - PRESENCE_ACTIVE_WINDOW_MS);
}
