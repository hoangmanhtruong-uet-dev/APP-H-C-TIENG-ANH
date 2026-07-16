import { z } from "zod";

import { learningSlugSchema } from "@/features/learning/schemas";

export const startListeningPracticeSchema = z.object({
  exerciseSlug: learningSlugSchema,
});

export const saveListeningAnswerSchema = z.object({
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

export const submitListeningPracticeSchema = z.object({
  attemptId: z.uuid(),
  exerciseSlug: learningSlugSchema,
});

export const listeningRouteSchema = z.object({
  exerciseSlug: learningSlugSchema,
  attemptId: z.uuid(),
});

export type SaveListeningAnswerInput = z.input<
  typeof saveListeningAnswerSchema
>;
export type SubmitListeningPracticeInput = z.input<
  typeof submitListeningPracticeSchema
>;
