/**
 * Autosave fires often (~once per typing pause), so snapshotting every save would
 * flood the history. Instead we snapshot the pre-edit state at most once per window,
 * which keeps a useful trail without unbounded row growth.
 */
export const VERSION_THROTTLE_MS = 60_000; // 1 minute

/** True when enough time has passed since the last snapshot to record a new one. */
export function shouldSnapshot(
  lastVersionCreatedAt: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!lastVersionCreatedAt) return true;
  return now.getTime() - lastVersionCreatedAt.getTime() >= VERSION_THROTTLE_MS;
}
