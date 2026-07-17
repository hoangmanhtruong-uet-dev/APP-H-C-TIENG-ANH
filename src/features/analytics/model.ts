export const ANALYTICS_SKILLS = [
  "reading",
  "listening",
  "writing",
  "speaking",
  "vocabulary",
  "grammar",
] as const;

export type AnalyticsSkill = (typeof ANALYTICS_SKILLS)[number];
export type FeedbackStatus = "pending" | "ready" | "failed" | null;

export type LearnerProgressOverview = {
  lessonTotal: number;
  lessonCompleted: number;
  lessonInProgress: number;
  lessonProgressPercent: number;
  activePractice: number;
  activeWriting: number;
  activeSpeaking: number;
  activeMockTests: number;
  completedMockTests: number;
};

export type SkillProgress = {
  skill: AnalyticsSkill;
  activityCount: number;
  scoredCount: number;
  totalScore: number | null;
  totalMaxScore: number | null;
  accuracyPercent: number | null;
  latestActivityAt: string | null;
  feedbackStatus: FeedbackStatus;
};

export type RecentActivity = {
  activityType: string;
  skill: string;
  entityId: string;
  title: string;
  status: string;
  occurredAt: string;
  href: string;
  score: number | null;
  maxScore: number | null;
  feedbackStatus: FeedbackStatus;
};

export type MockTestHistory = {
  sessionId: string;
  mockTestSlug: string;
  title: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  readingScore: number | null;
  readingMaxScore: number | null;
  listeningScore: number | null;
  listeningMaxScore: number | null;
  href: string;
};

export const SKILL_LABELS: Record<AnalyticsSkill, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
};

export function isAnalyticsSkill(value: string): value is AnalyticsSkill {
  return ANALYTICS_SKILLS.some((skill) => skill === value);
}

export function isFeedbackStatus(
  value: string | null,
): value is FeedbackStatus {
  return (
    value === null ||
    value === "pending" ||
    value === "ready" ||
    value === "failed"
  );
}

export function getWeakAreas(skills: SkillProgress[]) {
  return skills
    .filter(
      (item) =>
        item.scoredCount >= 2 &&
        item.accuracyPercent !== null &&
        item.accuracyPercent < 70,
    )
    .toSorted((left, right) => {
      const accuracyDifference =
        (left.accuracyPercent ?? 100) - (right.accuracyPercent ?? 100);
      return accuracyDifference || left.skill.localeCompare(right.skill);
    });
}

export function formatFeedbackStatus(status: FeedbackStatus) {
  if (status === "pending") return "Đang xử lý";
  if (status === "ready") return "Đã có feedback";
  if (status === "failed") return "Xử lý thất bại";
  return "Chưa yêu cầu";
}

export function formatActivityStatus(status: string) {
  if (status === "completed" || status === "scored") return "Đã hoàn thành";
  if (status === "submitted") return "Đã nộp";
  if (status === "draft") return "Bản nháp";
  if (status === "abandoned") return "Đã dừng";
  return "Đang thực hiện";
}
