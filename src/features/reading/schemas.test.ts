import { describe, expect, it } from "vitest";

import {
  saveReadingAnswerSchema,
  submitReadingPracticeSchema,
} from "@/features/reading/schemas";

const attemptId = "11111111-1111-4111-8111-111111111111";
const questionId = "22222222-2222-4222-8222-222222222222";

describe("reading schemas", () => {
  it("normalizes surrounding whitespace but never accepts score or owner fields", () => {
    const parsed = saveReadingAnswerSchema.parse({
      attemptId,
      questionId,
      exerciseSlug: "academic-reading-cool-roofs",
      selectedOptionIds: [],
      answerText: "  reflective coating  ",
      clientRevision: 3,
      userId: "attacker",
      score: 100,
    });
    expect(parsed.answerText).toBe("reflective coating");
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("score");
  });

  it("rejects malformed attempts and revisions", () => {
    expect(
      submitReadingPracticeSchema.safeParse({
        attemptId: "not-a-uuid",
        exerciseSlug: "academic-reading-cool-roofs",
      }).success,
    ).toBe(false);
    expect(
      saveReadingAnswerSchema.safeParse({
        attemptId,
        questionId,
        exerciseSlug: "academic-reading-cool-roofs",
        selectedOptionIds: [],
        answerText: "answer",
        clientRevision: -1,
      }).success,
    ).toBe(false);
  });
});
