import { describe, expect, it } from "vitest";
import {
  activeYearChip,
  buildYearChips,
  formatDay,
  yearsLabel,
} from "@/features/papers/toolbar-helpers";

// A stand-in for the t() function; the chips only need the two year keys.
const t = ((key: string) =>
  ({
    "papers.yearAny": "Any year",
    "papers.yearLast5": "Last 5 years",
    "papers.yearRange2010_2016": "2010–2016",
    "papers.yearBefore2010": "Before 2010",
  })[key] ?? key) as never;

describe("toolbar-helpers", () => {
  it("formats a day label in the given language", () => {
    // The v1.1.12 bug this file was extracted for printed the UTC day,
    // not the calendar day, east of Greenwich after midnight.
    expect(formatDay("2026-07-31", "en")).toBe("Jul 31");
  });

  it("labels inclusive year ranges", () => {
    expect(yearsLabel(2010, 2016)).toBe("2010–2016");
    expect(yearsLabel(2010, null)).toBe("2010–");
    expect(yearsLabel(null, 2016)).toBe("–2016");
    expect(yearsLabel(null, null)).toBe("");
  });

  it("builds the four year chips with the current year anchoring the last-5 range", () => {
    const chips = buildYearChips(t);
    expect(chips.map((c) => c.key)).toEqual(["any", "last5", "2010-2016", "before2010"]);
    const currentYear = new Date().getFullYear();
    const last5 = chips.find((c) => c.key === "last5");
    expect(last5).toEqual({
      key: "last5",
      label: "Last 5 years",
      from: currentYear - 5,
      to: currentYear,
    });
  });

  it("finds the active chip by its exact bounds", () => {
    const chips = buildYearChips(t);
    expect(activeYearChip(chips, null, null)).toBe("any");
    expect(activeYearChip(chips, 2010, 2016)).toBe("2010-2016");
    expect(activeYearChip(chips, null, 2009)).toBe("before2010");
    // A bounds pair no chip covers stays undefined rather than matching loosely.
    expect(activeYearChip(chips, 2010, 2017)).toBeUndefined();
  });
});
