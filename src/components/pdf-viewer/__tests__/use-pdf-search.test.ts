// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePdfSearch } from "@/components/pdf-viewer/use-pdf-search";

beforeEach(() => {
  // jsdom has no scrollIntoView; runSearch jumps to the first mark.
  Element.prototype.scrollIntoView = vi.fn();
  document.body.innerHTML = "";
});

/** Builds a text layer like pdf.js does: a div of spans of plain text. */
function makeLayer(text: string): HTMLDivElement {
  const layer = document.createElement("div");
  const span = document.createElement("span");
  span.textContent = text;
  layer.append(span);
  document.body.append(layer);
  return layer;
}

describe("usePdfSearch marks", () => {
  it("re-applying highlights to one layer keeps the shared mark list and count exact", () => {
    // Regression: applyHighlights APPENDED to the shared array, and the
    // viewer calls it after every text-layer render (each page that
    // scrolls into the virtualized window, every zoom). The array then
    // held stale refs from unmounted pages while the count never
    // updated for newly rendered ones — find-next dead-ended on
    // detached nodes.
    const layerA = makeLayer("the cat sat on the mat");
    const layerB = makeLayer("another cat here");
    let layers: (HTMLDivElement | null)[] = [layerA, layerB];
    const { result } = renderHook(() => usePdfSearch(() => layers));

    act(() => result.current.runSearch("cat"));
    expect(result.current.matchCount).toBe(2);

    // A third page scrolls into the window and the viewer re-applies
    // the current query to the NEW layer only.
    const layerC = makeLayer("a third cat");
    layers = [layerA, layerB, layerC];
    act(() => result.current.applyHighlights(layerC, "cat"));
    expect(result.current.matchCount).toBe(3);

    // Re-applying to an already-marked layer (zoom, canvas generation)
    // must not double-count.
    act(() => result.current.applyHighlights(layerA, "cat"));
    expect(result.current.matchCount).toBe(3);

    // And when a page leaves the window, a re-apply does not resurrect
    // its detached marks.
    layerA.remove();
    layers = [layerB, layerC];
    act(() => result.current.applyHighlights(layerB, "cat"));
    expect(result.current.matchCount).toBe(2);
  });

  it("clearing removes every mark and resets the count", () => {
    const layerA = makeLayer("cat one");
    const layerB = makeLayer("cat two");
    const layers = [layerA, layerB];
    const { result } = renderHook(() => usePdfSearch(() => layers));

    act(() => result.current.runSearch("cat"));
    expect(result.current.matchCount).toBe(2);

    act(() => result.current.clearSearch());
    expect(result.current.matchCount).toBe(0);
    expect(layerA.querySelector("mark")).toBeNull();
    expect(layerB.querySelector("mark")).toBeNull();
    expect(layerA.textContent).toBe("cat one");
  });
});
