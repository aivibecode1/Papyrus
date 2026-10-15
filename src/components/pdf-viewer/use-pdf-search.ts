import { useCallback, useRef, useState } from "react";
import { escapeHtml, highlightSpan } from "./search-highlight";

/**
 * In-PDF find: query state, match marks across the mounted text layers,
 * and match navigation. Owns its debounce timer, input ref and marks.
 *
 * @param getLayers current text-layer elements (mounted pages only).
 */
export function usePdfSearch(getLayers: () => (HTMLDivElement | null)[]) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const marksRef = useRef<HTMLElement[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /** Rebuilds the shared mark list from the DOM and refreshes the count.
   * The viewer calls applyHighlights after *every* text-layer render —
   * each page that scrolls into the virtualized window, and every zoom
   * or canvas generation — so appending to the array kept marks from
   * unmounted pages (detached nodes that scrollIntoView silently
   * ignores) and never updated the count for newly rendered pages. */
  const rebuildMarks = useCallback(() => {
    const marks: HTMLElement[] = [];
    for (const layer of getLayers()) {
      if (!layer) continue;
      layer.querySelectorAll("mark").forEach((m) => marks.push(m as HTMLElement));
    }
    marksRef.current = marks;
    setMatchCount(marks.length);
  }, [getLayers]);

  const applyHighlights = useCallback(
    (layer: HTMLElement, query: string) => {
      layer.querySelectorAll("mark").forEach((m) => {
        const span = m.parentElement;
        if (span) {
          span.innerHTML = escapeHtml(span.textContent ?? "");
        }
      });
      if (query.trim()) {
        layer.querySelectorAll<HTMLSpanElement>("span").forEach((span) => {
          highlightSpan(span, query.trim());
        });
      }
      rebuildMarks();
    },
    [rebuildMarks],
  );

  const runSearch = useCallback(
    (query: string) => {
      marksRef.current = [];
      getLayers().forEach((layer) => layer && applyHighlights(layer, query));
      setMatchCount(marksRef.current.length);
      if (marksRef.current.length > 0) {
        marksRef.current[0].scrollIntoView({ block: "center" });
      }
    },
    [applyHighlights, getLayers],
  );

  const jumpToMatch = useCallback((direction: 1 | -1) => {
    const marks = marksRef.current;
    if (marks.length === 0) return;
    const current = marks.findIndex(
      (m) =>
        m.getBoundingClientRect().top >= -40 &&
        m.getBoundingClientRect().top <= window.innerHeight * 0.6,
    );
    const target = current === -1 ? 0 : (current + direction + marks.length) % marks.length;
    marks[target].scrollIntoView({ block: "center" });
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setMatchCount(0);
    marksRef.current = [];
    getLayers().forEach((layer) => {
      layer?.querySelectorAll("mark").forEach((m) => {
        const span = m.parentElement;
        if (span) span.innerHTML = escapeHtml(span.textContent ?? "");
      });
    });
  }, [getLayers]);

  /** Live search entry point for the input's onChange (debounced). */
  const handleQueryChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      // Live search, debounced: the Enter key only jumps between
      // matches, so a stale state on Enter is not a problem.
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (value.trim()) {
        searchTimerRef.current = setTimeout(() => runSearch(value), 250);
      } else {
        marksRef.current = [];
        setMatchCount(0);
        getLayers().forEach((layer) => {
          layer?.querySelectorAll("mark").forEach((m) => {
            const span = m.parentElement;
            if (span) span.innerHTML = escapeHtml(span.textContent ?? "");
          });
        });
      }
    },
    [getLayers, runSearch],
  );

  return {
    searchOpen,
    setSearchOpen,
    searchQuery,
    matchCount,
    searchInputRef,
    applyHighlights,
    runSearch,
    jumpToMatch,
    clearSearch,
    handleQueryChange,
  };
}
