import { z } from "zod";

const idempotencyKey = z.string().trim().min(1).max(200);

export const speakingSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const startSpeakingSchema = z.object({ setSlug: speakingSlugSchema });

export const createSpeakingUploadIntentSchema = z.object({
  attemptId: z.string().uuid(),
  promptId: z.string().uuid(),
  mimeType: z.enum(["audio/webm", "audio/mp4", "audio/mpeg"]),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(15 * 1024 * 1024),
  durationSeconds: z.number().min(1).max(180),
  idempotencyKey,
});

export const verifySpeakingUploadSchema = z.object({
  intentId: z.string().uuid(),
  setSlug: speakingSlugSchema,
});

export const submitSpeakingSchema = z.object({
  attemptId: z.string().uuid(),
  setSlug: speakingSlugSchema,
  idempotencyKey,
});

export const speakingRouteSchema = z.object({
  setSlug: speakingSlugSchema,
  attemptId: z.string().uuid().optional(),
});

export const requestSpeakingAiSchema = z.object({
  attemptId: z.string().uuid(),
  setSlug: speakingSlugSchema,
  consent: z.literal(true),
});

export type CreateSpeakingUploadIntentInput = z.infer<
  typeof createSpeakingUploadIntentSchema
>;
export type VerifySpeakingUploadInput = z.infer<
  typeof verifySpeakingUploadSchema
>;
export type SubmitSpeakingInput = z.infer<typeof submitSpeakingSchema>;
export type RequestSpeakingAiInput = z.infer<typeof requestSpeakingAiSchema>;
