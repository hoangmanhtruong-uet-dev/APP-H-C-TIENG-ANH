import { z } from "zod";

import { learningSlugSchema } from "@/features/learning/schemas";

export const writingRouteSchema = z.object({
  taskSlug: learningSlugSchema,
  submissionId: z.uuid().optional(),
});

export const startWritingSchema = z.object({ taskSlug: learningSlugSchema });

export const saveWritingDraftSchema = z.object({
  submissionId: z.uuid(),
  taskSlug: learningSlugSchema,
  draftText: z.string().max(20_000),
  expectedRevision: z.number().int().min(0).max(2_147_483_647),
});

export const submitWritingSchema = z.object({
  submissionId: z.uuid(),
  taskSlug: learningSlugSchema,
});

export const requestWritingFeedbackSchema = z.object({
  submissionId: z.uuid(),
  taskSlug: learningSlugSchema,
  consent: z.literal(true),
});

export type SaveWritingDraftInput = z.input<typeof saveWritingDraftSchema>;
export type SubmitWritingInput = z.input<typeof submitWritingSchema>;
export type RequestWritingFeedbackInput = z.input<
  typeof requestWritingFeedbackSchema
>;
