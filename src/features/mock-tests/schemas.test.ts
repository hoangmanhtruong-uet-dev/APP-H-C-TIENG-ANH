import { describe, expect, it } from "vitest";

import {
  parseMockRunnerContext,
  startMockSectionSchema,
  submitMockSectionSchema,
} from "@/features/mock-tests/schemas";

const sessionId = "11111111-1111-4111-8111-111111111111";
const sectionId = "22222222-2222-4222-8222-222222222222";

describe("mock test schemas", () => {
  it("accepts only a complete, typed runner context", () => {
    expect(
      parseMockRunnerContext({
        mockTestSlug: "academic-foundation-mock",
        mockSessionId: sessionId,
        mockSectionAttemptId: sectionId,
      }),
    ).toEqual({
      mockTestSlug: "academic-foundation-mock",
      sessionId,
      sectionAttemptId: sectionId,
    });
    expect(
      parseMockRunnerContext({ mockTestSlug: "academic-foundation-mock" }),
    ).toBeUndefined();
  });

  it("rejects malformed identifiers and slugs", () => {
    expect(
      startMockSectionSchema.safeParse({
        mockTestSlug: "../draft",
        sessionId,
        sectionId,
      }).success,
    ).toBe(false);
    expect(
      submitMockSectionSchema.safeParse({
        mockTestSlug: "academic-foundation-mock",
        sessionId: "not-a-uuid",
        sectionAttemptId: sectionId,
        idempotencyKey: "submit-once",
      }).success,
    ).toBe(false);
  });

  it("requires a bounded idempotency key", () => {
    expect(
      submitMockSectionSchema.safeParse({
        mockTestSlug: "academic-foundation-mock",
        sessionId,
        sectionAttemptId: sectionId,
        idempotencyKey: "",
      }).success,
    ).toBe(false);
  });
});
