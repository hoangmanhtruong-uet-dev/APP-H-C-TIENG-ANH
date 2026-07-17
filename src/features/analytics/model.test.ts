import { describe, expect, it } from "vitest";

import {
  formatFeedbackStatus,
  getWeakAreas,
  type SkillProgress,
} from "./model";

function skill(
  name: SkillProgress["skill"],
  scoredCount: number,
  accuracyPercent: number | null,
): SkillProgress {
  return {
    skill: name,
    activityCount: scoredCount,
    scoredCount,
    totalScore: null,
    totalMaxScore: null,
    accuracyPercent,
    latestActivityAt: null,
    feedbackStatus: null,
  };
}

describe("learner analytics model", () => {
  it("only marks objective skills weak when enough persisted evidence exists", () => {
    expect(
      getWeakAreas([
        skill("reading", 2, 45),
        skill("listening", 3, 68),
        skill("vocabulary", 1, 20),
        skill("grammar", 4, 80),
        skill("writing", 5, null),
      ]).map((item) => item.skill),
    ).toEqual(["reading", "listening"]);
  });

  it("does not invent a feedback result when no run exists", () => {
    expect(formatFeedbackStatus(null)).toBe("Chưa yêu cầu");
    expect(formatFeedbackStatus("ready")).toBe("Đã có feedback");
  });
});
