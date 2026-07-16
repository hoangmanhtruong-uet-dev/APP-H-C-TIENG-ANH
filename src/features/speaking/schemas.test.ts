import { describe, expect, it } from "vitest";

import {
  createSpeakingUploadIntentSchema,
  requestSpeakingAiSchema,
  speakingSlugSchema,
} from "@/features/speaking/schemas";

describe("Phase 9 Speaking input boundaries", () => {
  it("accepts only route-safe published-set slugs", () => {
    expect(speakingSlugSchema.safeParse("everyday-choices").success).toBe(true);
    expect(speakingSlugSchema.safeParse("../draft").success).toBe(false);
  });

  it("enforces the global audio envelope before an upload intent", () => {
    const base = {
      attemptId: "99111111-1111-4111-8111-111111111111",
      promptId: "99222222-2222-4222-8222-222222222222",
      mimeType: "audio/webm" as const,
      sizeBytes: 1024,
      durationSeconds: 30,
      idempotencyKey: "upload-1",
    };
    expect(createSpeakingUploadIntentSchema.safeParse(base).success).toBe(true);
    expect(
      createSpeakingUploadIntentSchema.safeParse({
        ...base,
        sizeBytes: 15 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
    expect(
      createSpeakingUploadIntentSchema.safeParse({
        ...base,
        durationSeconds: 181,
      }).success,
    ).toBe(false);
  });

  it("requires explicit true consent for optional provider processing", () => {
    expect(
      requestSpeakingAiSchema.safeParse({
        attemptId: "99111111-1111-4111-8111-111111111111",
        setSlug: "everyday-choices",
        consent: false,
      }).success,
    ).toBe(false);
  });
});
