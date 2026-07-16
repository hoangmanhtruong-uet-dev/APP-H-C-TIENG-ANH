export const LEARNING_SKILLS = [
  "foundations",
  "listening",
  "reading",
  "writing",
  "speaking",
  "vocabulary",
  "grammar",
] as const;

export const LEARNING_TEST_TYPES = [
  "academic",
  "general_training",
  "both",
] as const;

export const LEARNING_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export const CONTENT_STATUSES = [
  "draft",
  "in_review",
  "published",
  "archived",
] as const;

export const LESSON_SECTION_TYPES = [
  "text",
  "example",
  "checklist",
  "tip",
  "warning",
  "summary",
] as const;

export type LearningSkill = (typeof LEARNING_SKILLS)[number];
export type LearningTestType = (typeof LEARNING_TEST_TYPES)[number];
export type LearningDifficulty = (typeof LEARNING_DIFFICULTIES)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type LessonSectionType = (typeof LESSON_SECTION_TYPES)[number];

export const LEARNING_SKILL_LABELS: Record<LearningSkill, string> = {
  foundations: "Nền tảng IELTS",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
};

export const LEARNING_TEST_TYPE_LABELS: Record<LearningTestType, string> = {
  academic: "IELTS Academic",
  general_training: "IELTS General Training",
  both: "Academic & General Training",
};

export const LEARNING_DIFFICULTY_LABELS: Record<LearningDifficulty, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

export const SECTION_TYPE_LABELS: Record<LessonSectionType, string> = {
  text: "Nội dung",
  example: "Ví dụ",
  checklist: "Checklist",
  tip: "Gợi ý",
  warning: "Lưu ý",
  summary: "Tóm tắt",
};

export function isLearningSkill(value: string): value is LearningSkill {
  return LEARNING_SKILLS.some((item) => item === value);
}

export function isLearningTestType(value: string): value is LearningTestType {
  return LEARNING_TEST_TYPES.some((item) => item === value);
}

export function isLearningDifficulty(
  value: string,
): value is LearningDifficulty {
  return LEARNING_DIFFICULTIES.some((item) => item === value);
}

export function isLessonSectionType(value: string): value is LessonSectionType {
  return LESSON_SECTION_TYPES.some((item) => item === value);
}
