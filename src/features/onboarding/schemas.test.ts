import { describe, expect, it } from "vitest";

import {
  availabilityStepSchema,
  createExamDateStepSchema,
  createLearnerPreferencesFormSchema,
  currentBandStepSchema,
  learnerPreferencesSchema,
  prioritySkillsStepSchema,
  targetStepSchema,
  testTypeStepSchema,
} from "./schemas";

describe("onboarding schemas", () => {
  it("accepts only supported IELTS test types", () => {
    expect(testTypeStepSchema.parse({ testType: "academic" })).toEqual({
      testType: "academic",
    });
    expect(testTypeStepSchema.safeParse({ testType: "toefl" }).success).toBe(
      false,
    );
  });

  it("normalizes an unknown current band to null", () => {
    expect(
      currentBandStepSchema.parse({ currentBand: "unknown" }).currentBand,
    ).toBeNull();
    expect(
      currentBandStepSchema.parse({ currentBand: "5.5" }).currentBand,
    ).toBe(5.5);
  });

  it("rejects target bands outside half-band increments", () => {
    expect(
      targetStepSchema.safeParse({
        targetBand: "7.2",
        primaryGoal: "study_abroad",
      }).success,
    ).toBe(false);
    expect(
      targetStepSchema.parse({
        targetBand: "7.5",
        primaryGoal: "study_abroad",
      }).targetBand,
    ).toBe(7.5);
  });

  it("accepts an optional exam date but rejects a past date", () => {
    const schema = createExamDateStepSchema("2026-07-16");
    expect(schema.parse({ targetExamDate: "" }).targetExamDate).toBeNull();
    expect(schema.safeParse({ targetExamDate: "2026-07-15" }).success).toBe(
      false,
    );
    expect(schema.parse({ targetExamDate: "2026-07-16" }).targetExamDate).toBe(
      "2026-07-16",
    );
  });

  it("restricts availability to supported durations and 1-7 days", () => {
    expect(
      availabilityStepSchema.parse({
        dailyStudyMinutes: "45",
        studyDaysPerWeek: "5",
      }),
    ).toEqual({ dailyStudyMinutes: 45, studyDaysPerWeek: 5 });
    expect(
      availabilityStepSchema.safeParse({
        dailyStudyMinutes: "20",
        studyDaysPerWeek: "0",
      }).success,
    ).toBe(false);
  });

  it("requires unique supported priority skills", () => {
    expect(
      prioritySkillsStepSchema.parse({
        prioritySkills: ["reading", "writing"],
      }).prioritySkills,
    ).toEqual(["reading", "writing"]);
    expect(
      prioritySkillsStepSchema.safeParse({ prioritySkills: [] }).success,
    ).toBe(false);
    expect(
      prioritySkillsStepSchema.safeParse({
        prioritySkills: ["reading", "reading"],
      }).success,
    ).toBe(false);
  });

  it("validates a complete stored learner profile", () => {
    expect(
      learnerPreferencesSchema.safeParse({
        test_type: "academic",
        current_band: null,
        target_band: 7,
        target_exam_date: null,
        daily_study_minutes: 45,
        study_days_per_week: 5,
        priority_skills: ["writing"],
        primary_goal: "university",
      }).success,
    ).toBe(true);
  });

  it("parses a full profile preferences form", () => {
    const result = createLearnerPreferencesFormSchema("2026-07-16").parse({
      testType: "general_training",
      currentBand: "6.0",
      targetBand: "7.0",
      primaryGoal: "immigration",
      targetExamDate: "2026-12-01",
      dailyStudyMinutes: "60",
      studyDaysPerWeek: "6",
      prioritySkills: ["listening", "speaking"],
    });

    expect(result.currentBand).toBe(6);
    expect(result.targetBand).toBe(7);
    expect(result.dailyStudyMinutes).toBe(60);
  });
});
