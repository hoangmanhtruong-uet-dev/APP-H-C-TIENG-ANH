import type { QuestionType } from "@/features/practice/model";

export const listeningQuestionTypes = [
  "single_choice",
  "multiple_choice",
  "short_text",
] as const satisfies readonly QuestionType[];

export type ListeningQuestionType = (typeof listeningQuestionTypes)[number];

export function isListeningQuestionType(
  value: string,
): value is ListeningQuestionType {
  return listeningQuestionTypes.includes(value as ListeningQuestionType);
}

export function formatListeningQuestionType(type: ListeningQuestionType) {
  const labels: Record<ListeningQuestionType, string> = {
    single_choice: "Single choice",
    multiple_choice: "Multiple choice",
    short_text: "Form / note completion",
  };
  return labels[type];
}

export function formatListeningTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safeSeconds / 60)}:${(safeSeconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
