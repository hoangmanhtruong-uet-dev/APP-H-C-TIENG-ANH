import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(
    "NEXT_PUBLIC_SUPABASE_URL phải là URL hợp lệ.",
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY không được để trống."),
  NEXT_PUBLIC_SITE_URL: z
    .url("NEXT_PUBLIC_SITE_URL phải là URL hợp lệ.")
    .optional(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.email().optional(),
});

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXT_PUBLIC_SUPPORT_EMAIL: z.email().optional(),
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
    OPENAI_API_KEY: z.string().trim().min(1).optional(),
    OPENAI_WRITING_MODEL: z.string().trim().min(1).optional(),
    WRITING_FEEDBACK_SIGNING_SECRET: z.string().trim().min(32).optional(),
    OPENAI_SPEAKING_TRANSCRIPTION_MODEL: z.string().trim().min(1).optional(),
    OPENAI_SPEAKING_FEEDBACK_MODEL: z.string().trim().min(1).optional(),
    SPEAKING_PIPELINE_SIGNING_SECRET: z.string().trim().min(32).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1).optional(),
    STORAGE_CLEANUP_SECRET: z.string().trim().min(32).optional(),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV === "production" && !env.NEXT_PUBLIC_SUPPORT_EMAIL) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SUPPORT_EMAIL"],
        message: "bắt buộc trong production để tiếp nhận yêu cầu dữ liệu",
      });
    }

    if (env.NODE_ENV === "production" && !env.NEXT_PUBLIC_SITE_URL) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SITE_URL"],
        message: "bắt buộc trong production",
      });
    }

    if (
      env.NODE_ENV === "production" &&
      !env.SPEAKING_PIPELINE_SIGNING_SECRET
    ) {
      context.addIssue({
        code: "custom",
        path: ["SPEAKING_PIPELINE_SIGNING_SECRET"],
        message: "bắt buộc trong production để xác minh upload Speaking",
      });
    }

    if (
      env.OPENAI_API_KEY &&
      !env.WRITING_FEEDBACK_SIGNING_SECRET &&
      !env.SPEAKING_PIPELINE_SIGNING_SECRET
    ) {
      context.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "cần ít nhất một signing secret tương ứng",
      });
    }

    const writingConfigured = Boolean(
      env.OPENAI_WRITING_MODEL || env.WRITING_FEEDBACK_SIGNING_SECRET,
    );
    if (
      writingConfigured &&
      (!env.OPENAI_API_KEY || !env.WRITING_FEEDBACK_SIGNING_SECRET)
    ) {
      context.addIssue({
        code: "custom",
        path: ["WRITING_FEEDBACK_SIGNING_SECRET"],
        message:
          "OPENAI_API_KEY và signing secret phải được cấu hình cùng nhau",
      });
    }

    const speakingAiConfigured = Boolean(
      env.OPENAI_SPEAKING_TRANSCRIPTION_MODEL ||
      env.OPENAI_SPEAKING_FEEDBACK_MODEL,
    );
    if (
      speakingAiConfigured &&
      (!env.OPENAI_API_KEY || !env.SPEAKING_PIPELINE_SIGNING_SECRET)
    ) {
      context.addIssue({
        code: "custom",
        path: ["SPEAKING_PIPELINE_SIGNING_SECRET"],
        message: "Speaking AI cần OPENAI_API_KEY và signing secret",
      });
    }

    const cleanupConfigured = Boolean(
      env.SUPABASE_SERVICE_ROLE_KEY || env.STORAGE_CLEANUP_SECRET,
    );
    if (
      cleanupConfigured &&
      (!env.SUPABASE_SERVICE_ROLE_KEY || !env.STORAGE_CLEANUP_SECRET)
    ) {
      context.addIssue({
        code: "custom",
        path: ["STORAGE_CLEANUP_SECRET"],
        message: "storage cleanup cần service-role key và cleanup secret",
      });
    }
    if (
      env.NODE_ENV === "production" &&
      (!env.SUPABASE_SERVICE_ROLE_KEY || !env.STORAGE_CLEANUP_SECRET)
    ) {
      context.addIssue({
        code: "custom",
        path: ["STORAGE_CLEANUP_SECRET"],
        message: "bắt buộc trong production để thực thi retention",
      });
    }
  });

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvironmentValidationError extends Error {
  constructor(details: string) {
    super(`Cấu hình môi trường chưa hợp lệ. ${details}`);
    this.name = "EnvironmentValidationError";
  }
}

export function parsePublicEnv(
  input: Record<string, string | undefined>,
): PublicEnv {
  const result = publicEnvSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(" ");

    throw new EnvironmentValidationError(details);
  }

  return result.data;
}

export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  });
}

export function parseServerEnv(
  input: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(" ");
    throw new EnvironmentValidationError(details);
  }
  return result.data;
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_WRITING_MODEL: process.env.OPENAI_WRITING_MODEL,
    WRITING_FEEDBACK_SIGNING_SECRET:
      process.env.WRITING_FEEDBACK_SIGNING_SECRET,
    OPENAI_SPEAKING_TRANSCRIPTION_MODEL:
      process.env.OPENAI_SPEAKING_TRANSCRIPTION_MODEL,
    OPENAI_SPEAKING_FEEDBACK_MODEL: process.env.OPENAI_SPEAKING_FEEDBACK_MODEL,
    SPEAKING_PIPELINE_SIGNING_SECRET:
      process.env.SPEAKING_PIPELINE_SIGNING_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STORAGE_CLEANUP_SECRET: process.env.STORAGE_CLEANUP_SECRET,
  });
}
