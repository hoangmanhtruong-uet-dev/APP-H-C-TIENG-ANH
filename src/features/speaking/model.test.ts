import { describe, expect, it } from "vitest";

import {
  speakingFeedbackPayloadSchema,
  speakingUploadIntentSchema,
} from "@/features/speaking/model";

describe("Phase 9 Speaking provider and database payloads", () => {
  it("accepts a private database-issued upload intent", () => {
    expect(
      speakingUploadIntentSchema.safeParse({
        intentId: "99111111-1111-4111-8111-111111111111",
        responseId: "99222222-2222-4222-8222-222222222222",
        bucketId: "speaking-recordings",
        storagePath: "user/attempt/response/object.webm",
        expiresAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it("allows missing estimates but rejects invented out-of-range scores", () => {
    const feedback = {
      estimatedOverallBand: null,
      estimatedFluencyBand: 6,
      estimatedLexicalBand: 5.5,
      estimatedGrammarBand: 5.5,
      estimatedPronunciationBand: null,
      pronunciationScope: "transcript_only" as const,
      confidence: "low" as const,
      summary: "Practice guidance based only on the available transcript.",
      criteria: { fluency: "One relevant idea is developed." },
      strengths: ["The response addresses the prompt."],
      suggestions: ["Add one concrete example."],
    };
    expect(speakingFeedbackPayloadSchema.safeParse(feedback).success).toBe(
      true,
    );
    expect(
      speakingFeedbackPayloadSchema.safeParse({
        ...feedback,
        estimatedOverallBand: 9.5,
      }).success,
    ).toBe(false);
  });
});
