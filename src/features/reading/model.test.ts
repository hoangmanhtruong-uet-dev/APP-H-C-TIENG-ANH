import { describe, expect, it } from "vitest";

import {
  formatReadingQuestionType,
  formatRemainingTime,
  isReadingQuestionType,
} from "@/features/reading/model";

describe("reading model", () => {
  it("accepts only implemented Reading question types", () => {
    expect(isReadingQuestionType("true_false_not_given")).toBe(true);
    expect(isReadingQuestionType("short_text")).toBe(false);
  });

  it("formats timer values without negative time", () => {
    expect(formatRemainingTime(65)).toBe("1:05");
    expect(formatRemainingTime(-5)).toBe("0:00");
  });

  it("provides a stable human label", () => {
    expect(formatReadingQuestionType("matching_headings")).toBe(
      "Matching headings",
    );
  });
});
