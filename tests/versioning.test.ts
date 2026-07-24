import { describe, expect, it } from "vitest";
import { shouldSnapshot, VERSION_THROTTLE_MS } from "@/lib/versioning";

describe("shouldSnapshot", () => {
  it("always snapshots when there is no prior version", () => {
    expect(shouldSnapshot(null)).toBe(true);
    expect(shouldSnapshot(undefined)).toBe(true);
  });

  it("does not snapshot again within the throttle window", () => {
    const now = new Date("2026-01-01T00:00:30Z");
    const recent = new Date("2026-01-01T00:00:10Z"); // 20s ago (< 60s)
    expect(shouldSnapshot(recent, now)).toBe(false);
  });

  it("snapshots once the throttle window has elapsed", () => {
    const now = new Date("2026-01-01T00:02:00Z");
    const old = new Date("2026-01-01T00:00:30Z"); // 90s ago (> 60s)
    expect(shouldSnapshot(old, now)).toBe(true);
  });

  it("snapshots exactly at the throttle boundary", () => {
    const now = new Date(VERSION_THROTTLE_MS);
    const then = new Date(0);
    expect(shouldSnapshot(then, now)).toBe(true);
  });
});
