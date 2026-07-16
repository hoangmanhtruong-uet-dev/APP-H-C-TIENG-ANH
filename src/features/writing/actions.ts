"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writingFeedbackStartSchema } from "@/features/writing/model";
import {
  requestWritingFeedbackSchema,
  saveWritingDraftSchema,
  startWritingSchema,
  submitWritingSchema,
  type RequestWritingFeedbackInput,
  type SaveWritingDraftInput,
  type SubmitWritingInput,
} from "@/features/writing/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";
import {
  buildWritingFeedbackPayload,
  classifyWritingAiError,
  createWritingFeedbackFailureSignature,
  createWritingFeedbackSignature,
  generateWritingFeedback,
  getWritingAiConfiguration,
} from "@/server/writing/ai-feedback";

export type WritingSaveState =
  | {
      status: "saved";
      serverRevision: number;
      wordCount: number;
      minimumWordsMet: boolean;
      savedAt: string;
    }
  | {
      status: "conflict";
      serverRevision: number | null;
      message: string;
    }
  | { status: "error"; message: string };

export async function startWritingAction(formData: FormData) {
  const parsed = startWritingSchema.safeParse({
    taskSlug: formData.get("taskSlug"),
  });
  if (!parsed.success) redirect("/practice/writing?error=invalid");
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("start_writing_submission", {
    p_task_slug: parsed.data.taskSlug,
    p_idempotency_key: randomUUID(),
  });
  if (error || !data) {
    redirect(`/practice/writing/${parsed.data.taskSlug}?error=start`);
  }
  revalidateWritingPaths(parsed.data.taskSlug);
  redirect(`/practice/writing/${parsed.data.taskSlug}`);
}

export async function saveWritingDraftAction(
  input: SaveWritingDraftInput,
): Promise<WritingSaveState> {
  const parsed = saveWritingDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Bản nháp không hợp lệ." };
  }
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_writing_draft", {
    p_submission_id: parsed.data.submissionId,
    p_draft_text: parsed.data.draftText,
    p_expected_revision: parsed.data.expectedRevision,
  });
  if (error?.code === "40001") {
    const { data: serverDraft } = await supabase
      .from("writing_submissions")
      .select("server_revision")
      .eq("id", parsed.data.submissionId)
      .maybeSingle();
    return {
      status: "conflict",
      serverRevision: serverDraft?.server_revision ?? null,
      message:
        "PostgreSQL có bản nháp mới hơn. Nội dung đang gõ chưa bị ghi đè; hãy tải lại trang để đối chiếu trước khi tiếp tục.",
    };
  }
  if (error || !data) {
    return {
      status: "error",
      message:
        "Chưa thể lưu vào PostgreSQL. Nội dung vẫn còn trên màn hình; hãy thử lại trước khi nộp.",
    };
  }
  revalidateWritingPaths(parsed.data.taskSlug);
  return {
    status: "saved",
    serverRevision: data.server_revision,
    wordCount: data.word_count,
    minimumWordsMet: data.minimum_words_met,
    savedAt: data.last_saved_at,
  };
}

export async function submitWritingAction(input: SubmitWritingInput) {
  const parsed = submitWritingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error" as const,
      message: "Không xác định được bài cần nộp.",
    };
  }
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_writing_submission", {
    p_submission_id: parsed.data.submissionId,
    p_idempotency_key: randomUUID(),
  });
  if (error || !data) {
    return {
      status: "error" as const,
      message: "Không thể nộp bài. Hãy chắc chắn bản nháp đã lưu và thử lại.",
    };
  }
  revalidateWritingPaths(parsed.data.taskSlug, data.id);
  redirect(`/practice/writing/${parsed.data.taskSlug}/submission/${data.id}`);
}

export async function requestWritingFeedbackAction(
  input: RequestWritingFeedbackInput,
) {
  const parsed = requestWritingFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error" as const,
      message: "Cần xác nhận đồng ý trước khi gửi bài để nhận góp ý AI.",
    };
  }
  const config = getWritingAiConfiguration();
  if (!config) {
    return {
      status: "unavailable" as const,
      message:
        "Góp ý AI chưa được cấu hình. Bài đã nộp vẫn được lưu an toàn và có thể xem lại bình thường.",
    };
  }

  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("start_writing_feedback_request", {
    p_submission_id: parsed.data.submissionId,
    p_idempotency_key: randomUUID(),
    p_consent_version: "writing-ai-v1",
  });
  const start = writingFeedbackStartSchema.safeParse(data);
  if (error || !start.success) {
    return {
      status: "unavailable" as const,
      message:
        "Chưa thể bắt đầu góp ý AI. Bài nộp không bị ảnh hưởng; hãy thử lại sau.",
    };
  }
  if (!start.data.shouldCallProvider) {
    revalidateWritingPaths(parsed.data.taskSlug, parsed.data.submissionId);
    return start.data.status === "ready"
      ? { status: "ready" as const, message: "Góp ý đã sẵn sàng." }
      : {
          status: "error" as const,
          message:
            "Yêu cầu góp ý đang xử lý hoặc đã kết thúc. Hãy tải lại trang.",
        };
  }

  const expiresAt = new Date((Math.floor(Date.now() / 1_000) + 120) * 1_000);
  try {
    const generated = await generateWritingFeedback({
      config,
      taskTitle: start.data.taskTitle,
      taskPrompt: start.data.taskPrompt,
      instructions: start.data.instructions,
      minimumWords: start.data.minimumWords,
      essay: start.data.essay,
    });
    const payload = buildWritingFeedbackPayload(generated);
    const signature = createWritingFeedbackSignature({
      config,
      runId: start.data.runId,
      nonce: start.data.finalizeNonce,
      expiresAt,
      payload,
    });
    const { error: finalizeError } = await supabase.rpc(
      "finalize_writing_feedback",
      {
        p_run_id: start.data.runId,
        p_feedback_payload: payload,
        p_expires_at: expiresAt.toISOString(),
        p_signature: signature,
      },
    );
    if (finalizeError) throw finalizeError;
    revalidateWritingPaths(parsed.data.taskSlug, parsed.data.submissionId);
    return {
      status: "ready" as const,
      message: "Góp ý luyện tập đã sẵn sàng.",
    };
  } catch (providerError) {
    const errorCode = classifyWritingAiError(providerError);
    const signature = createWritingFeedbackFailureSignature({
      config,
      runId: start.data.runId,
      nonce: start.data.finalizeNonce,
      expiresAt,
      errorCode,
    });
    await supabase.rpc("fail_writing_feedback_run", {
      p_run_id: start.data.runId,
      p_error_code: errorCode,
      p_expires_at: expiresAt.toISOString(),
      p_signature: signature,
    });
    revalidateWritingPaths(parsed.data.taskSlug, parsed.data.submissionId);
    return {
      status: "error" as const,
      message:
        "Nhà cung cấp chưa trả về góp ý hợp lệ. Không có góp ý giả được tạo; bạn có thể thử lại sau.",
    };
  }
}

function revalidateWritingPaths(taskSlug: string, submissionId?: string) {
  revalidatePath("/practice/writing");
  revalidatePath(`/practice/writing/${taskSlug}`);
  if (submissionId) {
    revalidatePath(`/practice/writing/${taskSlug}/submission/${submissionId}`);
  }
  revalidatePath("/progress");
  revalidatePath("/dashboard");
}
