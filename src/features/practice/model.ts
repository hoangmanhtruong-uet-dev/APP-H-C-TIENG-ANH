import { z } from "zod";

export const questionTypes = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "short_text",
  "true_false_not_given",
  "matching_headings",
  "summary_completion",
] as const;

export type QuestionType = (typeof questionTypes)[number];

export const practiceResultSchema = z.object({
  attemptId: z.uuid(),
  exerciseSetId: z.uuid(),
  exerciseSetVersionId: z.uuid(),
  status: z.literal("scored"),
  score: z.number().int().nonnegative(),
  maxScore: z.number().int().positive(),
  submittedAt: z.string(),
  reviewAllowed: z.boolean(),
  questions: z.array(
    z.object({
      questionId: z.uuid(),
      position: z.number().int().positive(),
      questionType: z.enum(questionTypes),
      promptMarkdown: z.string(),
      points: z.number().int().positive(),
      answerText: z.string().nullable(),
      selectedOptionIds: z.array(z.uuid()),
      isCorrect: z.boolean(),
      awardedPoints: z.number().int().nonnegative(),
      correctOptionIds: z.array(z.uuid()).nullable(),
      acceptedTextAnswers: z.array(z.string()).nullable(),
      explanationMarkdown: z.string().nullable(),
    }),
  ),
});

export type PracticeResult = z.infer<typeof practiceResultSchema>;

export const readingPracticeResultSchema = practiceResultSchema.extend({
  startedAt: z.string(),
  expiresAt: z.string(),
  submittedAfterTimeLimit: z.boolean(),
});

export type ReadingPracticeResult = z.infer<typeof readingPracticeResultSchema>;

export const listeningPracticeResultSchema = readingPracticeResultSchema.extend(
  {
    transcriptMarkdown: z.string(),
  },
);

export type ListeningPracticeResult = z.infer<
  typeof listeningPracticeResultSchema
>;

export function isQuestionType(value: string): value is QuestionType {
  return questionTypes.includes(value as QuestionType);
}

export function calculateScorePercent(score: number, maxScore: number) {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

export function nextQuestionPosition(current: number, total: number) {
  return Math.min(Math.max(current + 1, 1), Math.max(total, 1));
}
