import { describe, expect, it } from "vitest";

import {
  calculateScorePercent,
  nextQuestionPosition,
  practiceResultSchema,
} from "@/features/practice/model";

describe("practice model", () => {
  it("calculates a bounded deterministic score percentage", () => {
    expect(calculateScorePercent(4, 5)).toBe(80);
    expect(calculateScorePercent(0, 0)).toBe(0);
  });

  it("keeps navigation inside the exercise", () => {
    expect(nextQuestionPosition(1, 4)).toBe(2);
    expect(nextQuestionPosition(4, 4)).toBe(4);
  });

  it("rejects an unscored result payload", () => {
    expect(
      practiceResultSchema.safeParse({ status: "in_progress" }).success,
    ).toBe(false);
  });
});
