// @vitest-environment jsdom
// Plan 064: the Arabic font preference lives in use-theme, applied to
// <html data-arabic-font> and persisted under papyrus-arabic-font.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  ARABIC_FONTS,
  THEMES,
  isArabicFont,
  isTheme,
  nextTheme,
  useTheme,
  type Theme,
} from "@/hooks/use-theme";

const FONT_KEY = "papyrus-arabic-font";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.arabicFont;
  // Seed the theme so getInitialTheme never touches matchMedia (jsdom
  // does not implement it).
  localStorage.setItem("papyrus-theme", "light");
});

describe("isArabicFont", () => {
  it("accepts only the two bundled families", () => {
    expect(ARABIC_FONTS).toEqual(["plex", "amiri"]);
    expect(isArabicFont("plex")).toBe(true);
    expect(isArabicFont("amiri")).toBe(true);
    expect(isArabicFont("comic-sans")).toBe(false);
    expect(isArabicFont(null)).toBe(false);
  });
});

describe("useTheme arabic font", () => {
  it("defaults to IBM Plex and applies the data attribute", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.arabicFont).toBe("plex");
    expect(document.documentElement.dataset.arabicFont).toBe("plex");
    expect(localStorage.getItem(FONT_KEY)).toBe("plex");
  });

  it("switches to Amiri, applying the attribute and persisting it", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setArabicFontTo("amiri"));
    expect(document.documentElement.dataset.arabicFont).toBe("amiri");
    expect(localStorage.getItem(FONT_KEY)).toBe("amiri");
    expect(result.current.arabicFont).toBe("amiri");
  });

  it("restores a stored choice on mount", () => {
    localStorage.setItem(FONT_KEY, "amiri");
    const { result } = renderHook(() => useTheme());
    expect(result.current.arabicFont).toBe("amiri");
    expect(document.documentElement.dataset.arabicFont).toBe("amiri");
  });

  it("ignores corrupted storage and falls back to the default", () => {
    localStorage.setItem(FONT_KEY, "wingdings");
    const { result } = renderHook(() => useTheme());
    expect(result.current.arabicFont).toBe("plex");
    expect(document.documentElement.dataset.arabicFont).toBe("plex");
  });
});

describe("isTheme", () => {
  it("accepts exactly the four selectable themes", () => {
    expect(THEMES).toEqual(["light", "sepia", "dark", "dos"]);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("sepia")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("dos")).toBe(true);
    expect(isTheme("amoled")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

describe("nextTheme", () => {
  it("cycles through every theme and wraps around", () => {
    expect(nextTheme("light")).toBe("sepia");
    expect(nextTheme("sepia")).toBe("dark");
    expect(nextTheme("dark")).toBe("dos");
    expect(nextTheme("dos")).toBe("light");
  });
});

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    delete document.documentElement.dataset.theme;
  });

  it("applies data-theme and the dark class for dos", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setThemeTo("dos"));
    expect(result.current.theme).toBe("dos");
    expect(document.documentElement.dataset.theme).toBe("dos");
    // dos is a dark palette, so Tailwind's dark: variants must be on.
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("papyrus-theme")).toBe("dos");
  });

  it("restores a stored dos theme on mount without a flash", () => {
    localStorage.setItem("papyrus-theme", "dos");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dos");
    expect(document.documentElement.dataset.theme).toBe("dos");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("drops the dark class again for a light theme", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setThemeTo("dos"));
    act(() => result.current.setThemeTo("sepia"));
    expect(document.documentElement.dataset.theme).toBe("sepia");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

// Every theme the top bar can cycle to must have a complete palette in
// index.css: a theme added to THEMES without tokens would render as an
// unstyled mix of the previous theme's colors.
describe("theme palettes in index.css", () => {
  const css = readFileSync(join(import.meta.dirname, "../../index.css"), "utf8");

  /** The flat declaration block that defines a theme's tokens. Palette
   * blocks contain no nested braces, so [^}]* captures them whole. */
  function paletteBlock(theme: Theme): string {
    const selector =
      theme === "light"
        ? /:root\s*\{/
        : theme === "dark"
          ? /\.dark\s*\{/
          : new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{`);
    const match = selector.exec(css);
    expect(match, `no palette selector for theme "${theme}"`).not.toBeNull();
    const start = match!.index + match![0].length;
    const end = css.indexOf("}", start);
    return css.slice(start, end);
  }

  it("defines one selector per theme", () => {
    for (const theme of THEMES) {
      expect(paletteBlock(theme), `theme "${theme}"`).not.toBe("");
    }
  });

  it("gives every theme the full token set the UI relies on", () => {
    const required = [
      "--background",
      "--foreground",
      "--card",
      "--card-foreground",
      "--primary",
      "--primary-foreground",
      "--secondary",
      "--secondary-foreground",
      "--muted",
      "--muted-foreground",
      "--accent",
      "--accent-foreground",
      "--destructive",
      "--border",
      "--input",
      "--ring",
    ];
    for (const theme of THEMES) {
      const block = paletteBlock(theme);
      const missing = required.filter((token) => !block.includes(`${token}:`));
      expect(missing, `theme "${theme}" is missing tokens`).toEqual([]);
    }
  });
});
