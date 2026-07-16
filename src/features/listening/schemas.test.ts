import { describe, expect, it } from "vitest";

import {
  saveListeningAnswerSchema,
  submitListeningPracticeSchema,
} from "@/features/listening/schemas";

const attemptId = "11111111-1111-4111-8111-111111111111";
const questionId = "22222222-2222-4222-8222-222222222222";

describe("listening schemas", () => {
  it("accepts only answer payload and strips client authority fields", () => {
    const parsed = saveListeningAnswerSchema.parse({
      attemptId,
      questionId,
      exerciseSlug: "academic-listening-community-library",
      selectedOptionIds: [],
      answerText: "  second floor  ",
      clientRevision: 2,
      userId: "attacker",
      score: 8,
      correctness: true,
      submittedAt: "fake",
      timerRemaining: 9999,
    });
    expect(parsed.answerText).toBe("second floor");
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("score");
    expect(parsed).not.toHaveProperty("timerRemaining");
  });
  it("rejects malformed UUIDs and negative revisions", () => {
    expect(
      submitListeningPracticeSchema.safeParse({
        attemptId: "bad",
        exerciseSlug: "academic-listening-community-library",
      }).success,
    ).toBe(false);
    expect(
      saveListeningAnswerSchema.safeParse({
        attemptId,
        questionId,
        exerciseSlug: "academic-listening-community-library",
        selectedOptionIds: [],
        answerText: "answer",
        clientRevision: -1,
      }).success,
    ).toBe(false);
  });
});
