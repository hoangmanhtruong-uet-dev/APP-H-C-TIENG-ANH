import type { QuestionType } from "@/features/practice/model";

export const readingQuestionTypes = [
  "multiple_choice",
  "true_false_not_given",
  "matching_headings",
  "summary_completion",
] as const satisfies readonly QuestionType[];

export type ReadingQuestionType = (typeof readingQuestionTypes)[number];

export function isReadingQuestionType(
  value: string,
): value is ReadingQuestionType {
  return readingQuestionTypes.includes(value as ReadingQuestionType);
}

export function formatReadingQuestionType(type: ReadingQuestionType) {
  const labels: Record<ReadingQuestionType, string> = {
    multiple_choice: "Multiple choice",
    true_false_not_given: "True / False / Not Given",
    matching_headings: "Matching headings",
    summary_completion: "Summary completion",
  };
  return labels[type];
}

export function formatRemainingTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
