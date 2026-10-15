import { beforeEach, describe, expect, it } from "vitest";

import {
  highestChatId,
  importChatTurns,
  loadChat,
  loadWalkthrough,
  type SectionEntry,
} from "@/stores/reader-persist";

const KEY = "papyrus-reader-walkthrough-v1";
const CHAT_KEY = "papyrus-reader-chat-v1";

function seed(paperId: string, sectionEntries: SectionEntry[], synthesis: SectionEntry | null) {
  localStorage.setItem(KEY, JSON.stringify({ [paperId]: { sectionEntries, synthesis } }));
}

function entry(status: SectionEntry["status"]): SectionEntry {
  return { text: "body", status, error: status === "error" ? "boom" : null };
}

describe("loadWalkthrough", () => {
  beforeEach(() => localStorage.clear());

  // A restored walkthrough exists so reopening a paper does not re-stream
  // every section. What it must NOT do is rewrite history: telling the
  // user a finished section was "stopped" loses the checkmark and reports
  // completed work as abandoned.
  it("preserves done and error, and only demotes in-flight statuses", () => {
    seed(
      "p1",
      [
        entry("done"),
        entry("error"),
        entry("loading"),
        entry("streaming"),
        entry("idle"),
        entry("stopped"),
      ],
      entry("done"),
    );

    const snap = loadWalkthrough("p1");

    expect(snap.sectionEntries.map((e) => e.status)).toEqual([
      "done",
      "error",
      "stopped",
      "stopped",
      "stopped",
      "stopped",
    ]);
    expect(snap.synthesis?.status).toBe("done");
  });

  it("keeps the error message on a restored error", () => {
    seed("p1", [entry("error")], null);
    expect(loadWalkthrough("p1").sectionEntries[0].error).toBe("boom");
  });

  it("returns an empty snapshot for an unknown paper", () => {
    expect(loadWalkthrough("missing")).toEqual({ sectionEntries: [], synthesis: null });
  });

  it("survives corrupt storage", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadWalkthrough("p1")).toEqual({ sectionEntries: [], synthesis: null });
  });
});

describe("importChatTurns", () => {
  beforeEach(() => localStorage.clear());

  it("maps the export {role, content} shape into persisted messages", () => {
    importChatTurns("p1", [
      { role: "user", content: "imported question" },
      { role: "assistant", content: "imported answer" },
    ]);

    // loadChat is the reader's own loader: it filters on `text`, so a
    // turn stored with `content` would be invisible.
    const loaded = loadChat("p1");
    expect(loaded.map((m) => m.text)).toEqual(["imported question", "imported answer"]);
    expect(loaded.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(loaded.every((m) => m.status === "done")).toBe(true);
  });

  it("starts imported ids past the highest id already in the chat", () => {
    localStorage.setItem(
      CHAT_KEY,
      JSON.stringify({
        p1: [{ id: 7, role: "user", text: "old", status: "done", error: null, selection: null }],
      }),
    );
    importChatTurns("p1", [{ role: "user", content: "new" }]);

    const stored = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "{}");
    expect(stored.p1).toHaveLength(2);
    expect(stored.p1[1].id).toBeGreaterThan(7);
  });

  it("keeps the per-paper turn cap", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ role: "user", content: `q${i}` }));
    importChatTurns("p1", many);
    const loaded = loadChat("p1");
    expect(loaded).toHaveLength(30);
    expect(loaded[loaded.length - 1].text).toBe("q39");
  });

  it("survives corrupt storage", () => {
    localStorage.setItem(CHAT_KEY, "{not json");
    expect(() => importChatTurns("p1", [{ role: "user", content: "x" }])).not.toThrow();
  });
});

describe("highestChatId", () => {
  it("ignores missing, non-numeric and unsafe ids", () => {
    expect(highestChatId([{ id: 3 }, { id: "9" }, { id: 1e19 }, {}, null, 5])).toBe(3);
    expect(highestChatId([])).toBe(0);
    expect(highestChatId(undefined)).toBe(0);
  });
});
