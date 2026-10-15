import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readLimitToCategory,
  readSearchField,
  writeLimitToCategory,
  writeSearchField,
} from "@/stores/papers-prefs";

// The vitest environment is "node" — provide an in-memory localStorage so
// the real persistence path is exercisable (same pattern as settings tests).
function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  } as Storage;
}
const localStorageMock = createMemoryStorage();
vi.stubGlobal("localStorage", localStorageMock);

describe("papers search preferences", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("defaults to the all-fields scope with the category limit off", () => {
    expect(readSearchField()).toBe("all");
    expect(readLimitToCategory()).toBe(false);
  });

  it("round-trips each persisted search field", () => {
    for (const field of ["all", "title", "author", "abstract", "id"] as const) {
      writeSearchField(field);
      expect(readSearchField()).toBe(field);
    }
  });

  it("falls back to all for an unknown or corrupt value", () => {
    // A hand-edited or half-written value must not poison the scope.
    writeSearchField("title");
    localStorage.setItem("papyrus-search-field", "bogus");
    expect(readSearchField()).toBe("all");
  });

  it("round-trips the category limit flag", () => {
    writeLimitToCategory(true);
    expect(readLimitToCategory()).toBe(true);
    writeLimitToCategory(false);
    expect(readLimitToCategory()).toBe(false);
  });
});
