// Theme token exposure inventory: every palette token the palettes
// define must also be mapped to a Tailwind color in `@theme inline`.
//
// `@theme inline` inlines each `--color-*` value into its utility at
// build time, so a token that is defined in the palettes but NOT mapped
// in `@theme inline` produces a utility class that emits NO CSS rule at
// all. That is how `text-destructive-foreground` (on every destructive
// Button and Badge) silently rendered with the inherited foreground
// color and failed text contrast in all four themes, with no build or
// lint error. This test fails on the next token added the same way.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..");
const css = readFileSync(join(SRC, "index.css"), "utf8");

/** The palette tokens: everything the `:root` block defines that is not
 * a radius, scrollbar, density or typography token. */
const ROOT_BLOCK = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
const NON_COLOR_TOKENS = new Set([
  "--radius",
  "--scrollbar-thumb",
  "--scrollbar-thumb-hover",
  "--space-card-y",
  "--text-card-title",
  "--text-card-meta",
]);
const paletteTokens = [...ROOT_BLOCK.matchAll(/(--[a-z0-9-]+):/g)]
  .map((m) => m[1])
  .filter((name) => !NON_COLOR_TOKENS.has(name));

describe("theme token exposure", () => {
  it("finds the palette tokens to check", () => {
    // Guards the inventory itself against a regex that silently matches
    // nothing (which would make the real assertion vacuous).
    expect(paletteTokens).toContain("--background");
    expect(paletteTokens).toContain("--destructive-foreground");
    expect(paletteTokens.length).toBeGreaterThanOrEqual(22);
  });

  it("maps every palette token to a Tailwind color", () => {
    const themeBlock = /@theme inline\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    const mapped = new Set([...themeBlock.matchAll(/(--color-[a-z0-9-]+):/g)].map((m) => m[1]));
    const unmapped = paletteTokens.filter((name) => !mapped.has(`--color-${name.slice(2)}`));
    expect(unmapped).toEqual([]);
  });
});
