import { z } from "zod";

import { learningSlugSchema } from "@/features/learning/schemas";

export const startReadingPracticeSchema = z.object({
  exerciseSlug: learningSlugSchema,
});

export const saveReadingAnswerSchema = z.object({
  attemptId: z.uuid(),
  questionId: z.uuid(),
  exerciseSlug: learningSlugSchema,
  selectedOptionIds: z.array(z.uuid()).max(20),
  answerText: z
    .string()
    .max(2000)
    .transform((value) => value.trim()),
  clientRevision: z.number().int().min(0).max(2_147_483_647),
});

export const submitReadingPracticeSchema = z.object({
  attemptId: z.uuid(),
  exerciseSlug: learningSlugSchema,
});

export const readingRouteSchema = z.object({
  exerciseSlug: learningSlugSchema,
  attemptId: z.uuid(),
});

export type SaveReadingAnswerInput = z.input<typeof saveReadingAnswerSchema>;

export type SubmitReadingPracticeInput = z.input<
  typeof submitReadingPracticeSchema
>;
