"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { speakingUploadIntentSchema } from "@/features/speaking/model";
import {
  createSpeakingUploadIntentSchema,
  startSpeakingSchema,
  submitSpeakingSchema,
  verifySpeakingUploadSchema,
  type CreateSpeakingUploadIntentInput,
  type SubmitSpeakingInput,
  type VerifySpeakingUploadInput,
} from "@/features/speaking/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";
import {
  createSpeakingSignature,
  getSpeakingPipelineSigningSecret,
  verifySpeakingAudio,
} from "@/server/speaking/audio-verification";

export async function startSpeakingAction(formData: FormData) {
  const parsed = startSpeakingSchema.safeParse({
    setSlug: formData.get("setSlug"),
  });
  if (!parsed.success) redirect("/practice/speaking?error=invalid");
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("start_speaking_attempt", {
    p_set_slug: parsed.data.setSlug,
    p_idempotency_key: randomUUID(),
  });
  if (error || !data)
    redirect(`/practice/speaking/${parsed.data.setSlug}?error=start`);
  revalidateSpeakingPaths(parsed.data.setSlug);
  redirect(`/practice/speaking/${parsed.data.setSlug}`);
}

export async function createSpeakingUploadIntentAction(
  input: CreateSpeakingUploadIntentInput,
) {
  const parsed = createSpeakingUploadIntentSchema.safeParse(input);
  if (!parsed.success)
    return { status: "error" as const, message: "Bản ghi âm không hợp lệ." };
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_speaking_upload_intent", {
    p_attempt_id: parsed.data.attemptId,
    p_prompt_id: parsed.data.promptId,
    p_mime_type: parsed.data.mimeType,
    p_size_bytes: parsed.data.sizeBytes,
    p_duration_seconds: parsed.data.durationSeconds,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  const intent = speakingUploadIntentSchema.safeParse(data);
  if (error || !intent.success) {
    return {
      status: "error" as const,
      message: "Không thể cấp quyền upload an toàn. Hãy ghi âm lại.",
    };
  }
  return { status: "ready" as const, intent: intent.data };
}

export async function verifySpeakingUploadAction(
  input: VerifySpeakingUploadInput,
) {
  const parsed = verifySpeakingUploadSchema.safeParse(input);
  if (!parsed.success)
    return { status: "error" as const, message: "Upload không hợp lệ." };
  const { account } = await requireCompletedOnboarding();
  const secret = getSpeakingPipelineSigningSecret();
  if (!secret) {
    return {
      status: "unavailable" as const,
      message:
        "Xác minh audio chưa được cấu hình. File chưa được gắn vào bài làm.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data: intent, error: intentError } = await supabase
    .from("speaking_upload_intents")
    .select("id, storage_path, expected_mime_type, status, expires_at")
    .eq("id", parsed.data.intentId)
    .maybeSingle();
  if (
    intentError ||
    !intent ||
    intent.status !== "issued" ||
    new Date(intent.expires_at) <= new Date()
  ) {
    return {
      status: "error" as const,
      message: "Quyền upload đã hết hạn hoặc không thuộc tài khoản này.",
    };
  }
  const { data: object, error: downloadError } = await supabase.storage
    .from("speaking-recordings")
    .download(intent.storage_path);
  if (downloadError || !object) {
    return {
      status: "error" as const,
      message: "Không đọc được audio private vừa upload.",
    };
  }
  try {
    const verified = await verifySpeakingAudio(
      object,
      intent.expected_mime_type,
    );
    const expiresAt = new Date((Math.floor(Date.now() / 1000) + 120) * 1000);
    const epoch = Math.floor(expiresAt.getTime() / 1000);
    const signature = createSpeakingSignature(secret, [
      "speaking-upload-v1",
      account.user.id,
      intent.id,
      verified.mimeType,
      verified.sizeBytes,
      Math.round(verified.durationSeconds * 1000),
      verified.sha256Checksum,
      epoch,
    ]);
    const { error } = await supabase.rpc("finalize_speaking_upload", {
      p_intent_id: intent.id,
      p_verified_mime_type: verified.mimeType,
      p_verified_size_bytes: verified.sizeBytes,
      p_verified_duration_seconds: verified.durationSeconds,
      p_sha256_checksum: verified.sha256Checksum,
      p_signature_expires_at: expiresAt.toISOString(),
      p_signature: signature,
    });
    if (error) throw error;
    revalidateSpeakingPaths(parsed.data.setSlug);
    return {
      status: "verified" as const,
      message: "Audio đã được PostgreSQL xác nhận.",
    };
  } catch {
    return {
      status: "error" as const,
      message:
        "Audio không qua xác minh định dạng, dung lượng hoặc thời lượng.",
    };
  }
}

export async function submitSpeakingAction(input: SubmitSpeakingInput) {
  const parsed = submitSpeakingSchema.safeParse(input);
  if (!parsed.success)
    return {
      status: "error" as const,
      message: "Không xác định được bài cần nộp.",
    };
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_speaking_attempt", {
    p_attempt_id: parsed.data.attemptId,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error || !data)
    return {
      status: "error" as const,
      message: "Cần có audio đã xác minh cho mọi câu bắt buộc trước khi nộp.",
    };
  revalidateSpeakingPaths(parsed.data.setSlug, data.id);
  redirect(`/practice/speaking/${parsed.data.setSlug}/attempt/${data.id}`);
}

function revalidateSpeakingPaths(setSlug: string, attemptId?: string) {
  revalidatePath("/practice/speaking");
  revalidatePath(`/practice/speaking/${setSlug}`);
  if (attemptId)
    revalidatePath(`/practice/speaking/${setSlug}/attempt/${attemptId}`);
  revalidatePath("/progress");
  revalidatePath("/dashboard");
}
