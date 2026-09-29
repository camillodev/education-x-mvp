import { describe, expect, it } from "vitest";
import { compareToBaseline } from "../../scripts/check-language.mjs";

describe("check-language: baseline ratchet", () => {
  it("passes when a file's violation count is at or below its baseline", () => {
    const baseline = { "a.ts": 3 };
    const current = { "a.ts": 3 };
    expect(compareToBaseline(current, baseline).ok).toBe(true);
  });

  it("fails when a file's violation count increases", () => {
    const baseline = { "a.ts": 3 };
    const current = { "a.ts": 4 };
    const result = compareToBaseline(current, baseline);
    expect(result.ok).toBe(false);
    expect(result.regressions).toContainEqual({ file: "a.ts", before: 3, after: 4 });
  });

  it("fails when a new file has any violation", () => {
    const baseline = {};
    const current = { "new-file.ts": 1 };
    const result = compareToBaseline(current, baseline);
    expect(result.ok).toBe(false);
    expect(result.regressions).toContainEqual({ file: "new-file.ts", before: 0, after: 1 });
  });

  it("passes when a file's violation count decreases", () => {
    const baseline = { "a.ts": 5 };
    const current = { "a.ts": 0 };
    expect(compareToBaseline(current, baseline).ok).toBe(true);
  });
});
