import { describe, it, expect } from "vitest";
import { DEFAULT_STAGES } from "./defaultStages";

const VALID_STAGE_TYPES = ["screening", "review", "publication"] as const;

describe("DEFAULT_STAGES", () => {
  it("has exactly 5 stages", () => {
    expect(DEFAULT_STAGES).toHaveLength(5);
  });

  it("has unique, consecutive, ascending stage_order values starting at 1", () => {
    const orders = DEFAULT_STAGES.map((s) => s.stage_order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(sorted).toEqual([1, 2, 3, 4, 5]);
    const unique = new Set(orders);
    expect(unique.size).toBe(orders.length);
  });

  it("has non-empty name_en for every stage", () => {
    DEFAULT_STAGES.forEach((s) => {
      expect(s.name_en.trim().length).toBeGreaterThan(0);
    });
  });

  it("has non-empty name_ar for every stage", () => {
    DEFAULT_STAGES.forEach((s) => {
      expect(s.name_ar.trim().length).toBeGreaterThan(0);
    });
  });

  it("uses only valid stage_type values", () => {
    DEFAULT_STAGES.forEach((s) => {
      expect(VALID_STAGE_TYPES).toContain(s.stage_type);
    });
  });
});
