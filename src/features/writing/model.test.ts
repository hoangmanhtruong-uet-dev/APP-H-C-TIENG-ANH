import { describe, expect, it } from "vitest";

import {
  formatWritingTime,
  writingFeedbackProviderSchema,
} from "@/features/writing/model";

const validFeedback = {
  overallBandEstimate: 6.5,
  confidence: "medium",
  summary: "Practice guidance, not an official score.",
  criteria: {
    taskResponse: { band: 6.5, comment: "Clear.", evidence: ["exact"] },
    coherenceCohesion: {
      band: 6,
      comment: "Connected.",
      evidence: ["exact"],
    },
    lexicalResource: {
      band: 6,
      comment: "Generally clear.",
      evidence: ["exact"],
    },
    grammaticalRangeAccuracy: {
      band: 6,
      comment: "Controlled.",
      evidence: ["exact"],
    },
  },
  strengths: ["Clear position."],
  priorityIssues: [
    { issue: "Develop the comparison.", evidence: "exact" },
    { issue: "Add an example.", evidence: "exact" },
    { issue: "Vary sentences.", evidence: "exact" },
  ],
  revisionPlan: ["Clarify thesis.", "Develop ideas.", "Proofread."],
  correctedExamples: [],
};

describe("writing feedback model", () => {
  it("accepts the strict half-band structured output", () => {
    expect(writingFeedbackProviderSchema.parse(validFeedback)).toEqual(
      validFeedback,
    );
  });

  it("rejects non-half bands and missing evidence", () => {
    expect(
      writingFeedbackProviderSchema.safeParse({
        ...validFeedback,
        overallBandEstimate: 6.3,
      }).success,
    ).toBe(false);
    expect(
      writingFeedbackProviderSchema.safeParse({
        ...validFeedback,
        criteria: {
          ...validFeedback.criteria,
          taskResponse: {
            ...validFeedback.criteria.taskResponse,
            evidence: [],
          },
        },
      }).success,
    ).toBe(false);
  });

  it("formats a non-negative server-derived countdown", () => {
    expect(formatWritingTime(125)).toBe("2:05");
    expect(formatWritingTime(-2)).toBe("0:00");
  });
});
