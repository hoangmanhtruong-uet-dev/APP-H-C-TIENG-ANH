import { z } from "zod";

export const speakingUploadIntentSchema = z.object({
  intentId: z.string().uuid(),
  responseId: z.string().uuid(),
  bucketId: z.literal("speaking-recordings"),
  storagePath: z.string().min(1).max(500),
  expiresAt: z.string(),
});

export const speakingFeedbackPayloadSchema = z.object({
  estimatedOverallBand: z.number().min(0).max(9).multipleOf(0.5).nullable(),
  estimatedFluencyBand: z.number().min(0).max(9).multipleOf(0.5).nullable(),
  estimatedLexicalBand: z.number().min(0).max(9).multipleOf(0.5).nullable(),
  estimatedGrammarBand: z.number().min(0).max(9).multipleOf(0.5).nullable(),
  estimatedPronunciationBand: z
    .number()
    .min(0)
    .max(9)
    .multipleOf(0.5)
    .nullable(),
  pronunciationScope: z.enum(["audio_available", "transcript_only"]),
  confidence: z.enum(["low", "medium", "high"]),
  summary: z.string().trim().min(1).max(3000),
  criteria: z.record(z.string(), z.string().max(2000)),
  strengths: z.array(z.string().trim().min(1).max(1000)).min(1).max(8),
  suggestions: z.array(z.string().trim().min(1).max(1000)).min(1).max(8),
});

export type SpeakingFeedbackPayload = z.infer<
  typeof speakingFeedbackPayloadSchema
>;
