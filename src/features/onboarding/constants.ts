export const TEST_TYPES = ["academic", "general_training"] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const PRIORITY_SKILLS = [
  "listening",
  "reading",
  "writing",
  "speaking",
] as const;
export type PrioritySkill = (typeof PRIORITY_SKILLS)[number];

export const PRIMARY_GOALS = [
  "university",
  "graduation",
  "study_abroad",
  "work",
  "immigration",
  "personal_development",
  "other",
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export const DAILY_STUDY_MINUTES = [15, 30, 45, 60, 90, 120] as const;

export const BAND_SCORES = Array.from({ length: 19 }, (_, index) => index / 2);

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  academic: "IELTS Academic",
  general_training: "IELTS General Training",
};

export const SKILL_LABELS: Record<PrioritySkill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export const GOAL_LABELS: Record<PrimaryGoal, string> = {
  university: "Xét tuyển đại học",
  graduation: "Tốt nghiệp",
  study_abroad: "Du học",
  work: "Công việc",
  immigration: "Định cư",
  personal_development: "Phát triển bản thân",
  other: "Mục tiêu khác",
};

export const ONBOARDING_STEPS = [
  "Bắt đầu",
  "Bài thi",
  "Hiện tại",
  "Mục tiêu",
  "Ngày thi",
  "Lịch học",
  "Kỹ năng",
  "Xác nhận",
] as const;

export function isTestType(value: string | null): value is TestType {
  return TEST_TYPES.some((item) => item === value);
}

export function isPrioritySkill(value: string): value is PrioritySkill {
  return PRIORITY_SKILLS.some((item) => item === value);
}

export function isPrimaryGoal(value: string | null): value is PrimaryGoal {
  return PRIMARY_GOALS.some((item) => item === value);
}
