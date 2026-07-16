import { describe, expect, it } from "vitest";

import {
  formatListeningQuestionType,
  formatListeningTime,
  isListeningQuestionType,
} from "@/features/listening/model";

describe("listening model", () => {
  it("accepts only the three implemented Listening types", () => {
    expect(isListeningQuestionType("single_choice")).toBe(true);
    expect(isListeningQuestionType("multiple_choice")).toBe(true);
    expect(isListeningQuestionType("short_text")).toBe(true);
    expect(isListeningQuestionType("true_false_not_given")).toBe(false);
  });
  it("formats non-negative database-derived countdown values", () => {
    expect(formatListeningTime(125)).toBe("2:05");
    expect(formatListeningTime(-1)).toBe("0:00");
  });
  it("labels form completion consistently", () => {
    expect(formatListeningQuestionType("short_text")).toBe(
      "Form / note completion",
    );
  });
});
