// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  deleteBrowserKey,
  getBrowserKey,
  hasBrowserKey,
  isTauri,
  setBrowserKey,
} from "@/lib/ai-browser-keys";

/**
 * The browser-preview key store. It is the only place keys can live when
 * the app runs outside Tauri, so the contract that matters is the
 * module's own headline: keys stay in memory ONLY. If a future change
 * persists them, these tests must fail.
 */
describe("ai-browser-keys (browser preview key store)", () => {
  it("stores, reads and deletes keys by provider id", () => {
    expect(getBrowserKey("p1")).toBe("");
    expect(hasBrowserKey("p1")).toBe(false);

    setBrowserKey("p1", "sk-test-1");
    expect(getBrowserKey("p1")).toBe("sk-test-1");
    expect(hasBrowserKey("p1")).toBe(true);

    // One provider's key must never answer for another id.
    expect(getBrowserKey("p2")).toBe("");

    deleteBrowserKey("p1");
    expect(getBrowserKey("p1")).toBe("");
    expect(hasBrowserKey("p1")).toBe(false);
  });

  it("never touches localStorage: keys stay memory-only", () => {
    setBrowserKey("p1", "sk-test-secret");
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      expect(localStorage.getItem(key ?? "")).not.toContain("sk-test-secret");
    }
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain("sk-test-secret");
  });

  it("reports Tauri by the internals global, defaulting to false in jsdom", () => {
    expect(isTauri()).toBe(false);
  });
});
