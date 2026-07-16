import { describe, expect, it } from "vitest";

import { savePracticeAnswerSchema } from "@/features/practice/schemas";

describe("practice schemas", () => {
  it("accepts a server-bound answer contract without ownership fields", () => {
    const result = savePracticeAnswerSchema.safeParse({
      attemptId: "61111111-1111-4111-8111-111111111111",
      questionId: "32000000-0000-4000-8000-000000000001",
      exerciseSlug: "academic-vocabulary-foundations",
      selectedOptionIds: ["33000000-0000-4000-8000-000000000001"],
      answerText: "",
      clientRevision: "2",
      nextPosition: "2",
    });
    expect(result.success).toBe(true);
    expect(result.success && "userId" in result.data).toBe(false);
  });

  it("rejects malformed ids and excessive option payloads", () => {
    expect(
      savePracticeAnswerSchema.safeParse({
        attemptId: "not-an-id",
        questionId: "not-an-id",
        exerciseSlug: "../draft",
        selectedOptionIds: Array.from({ length: 21 }, () =>
          crypto.randomUUID(),
        ),
        clientRevision: -1,
        nextPosition: 0,
      }).success,
    ).toBe(false);
  });
});
