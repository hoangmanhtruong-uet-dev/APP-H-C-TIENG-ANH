"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  saveReadingAnswerSchema,
  startReadingPracticeSchema,
  submitReadingPracticeSchema,
  type SaveReadingAnswerInput,
  type SubmitReadingPracticeInput,
} from "@/features/reading/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export type ReadingSaveState =
  | {
      status: "saved";
      clientRevision: number;
      savedAt: string;
    }
  | {
      status: "conflict";
      serverRevision: number | null;
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

export async function startReadingPracticeAction(formData: FormData) {
  const parsed = startReadingPracticeSchema.safeParse({
    exerciseSlug: formData.get("exerciseSlug"),
  });
  if (!parsed.success) redirect("/practice/reading?error=invalid");

  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("start_exercise_attempt", {
    p_exercise_slug: parsed.data.exerciseSlug,
    p_idempotency_key: randomUUID(),
  });
  if (error || !data) {
    redirect(`/practice/reading/${parsed.data.exerciseSlug}?error=start`);
  }

  revalidateReadingPaths(parsed.data.exerciseSlug);
  redirect(`/practice/reading/${parsed.data.exerciseSlug}`);
}

export async function saveReadingAnswerAction(
  input: SaveReadingAnswerInput,
): Promise<ReadingSaveState> {
  const parsed = saveReadingAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Câu trả lời không hợp lệ. Hãy kiểm tra rồi thử lại.",
    };
  }

  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_exercise_answer", {
    p_attempt_id: parsed.data.attemptId,
    p_question_id: parsed.data.questionId,
    p_selected_option_ids: parsed.data.selectedOptionIds,
    p_answer_text: parsed.data.answerText,
    p_client_revision: parsed.data.clientRevision,
  });

  if (error?.code === "40001") {
    const { data: serverAnswer } = await supabase
      .from("learner_answers")
      .select("client_revision")
      .eq("attempt_id", parsed.data.attemptId)
      .eq("question_id", parsed.data.questionId)
      .maybeSingle();
    return {
      status: "conflict",
      serverRevision: serverAnswer?.client_revision ?? null,
      message:
        "Có bản trả lời mới hơn trong PostgreSQL. Bản đang nhập chưa ghi đè dữ liệu đó; hãy tải lại để đối chiếu.",
    };
  }

  if (error || !data) {
    return {
      status: "error",
      message:
        "Chưa thể lưu vào PostgreSQL. Câu trả lời vẫn còn trên màn hình; hãy thử lại trước khi nộp.",
    };
  }

  revalidateReadingPaths(parsed.data.exerciseSlug);
  return {
    status: "saved",
    clientRevision: data.client_revision,
    savedAt: data.saved_at,
  };
}

export async function submitReadingPracticeAction(
  input: SubmitReadingPracticeInput,
) {
  const parsed = submitReadingPracticeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error" as const,
      message: "Không thể xác định attempt cần nộp.",
    };
  }

  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_exercise_attempt", {
    p_attempt_id: parsed.data.attemptId,
  });
  if (error || !data) {
    return {
      status: "error" as const,
      message: "Không thể nộp bài. Hãy kiểm tra trạng thái lưu rồi thử lại.",
    };
  }

  const { data: exercise } = await supabase
    .from("exercise_sets")
    .select("slug, domain")
    .eq("id", data.exercise_set_id)
    .eq("slug", parsed.data.exerciseSlug)
    .eq("domain", "reading")
    .maybeSingle();
  if (!exercise) {
    return {
      status: "error" as const,
      message: "Attempt không thuộc bài Reading hiện tại.",
    };
  }

  revalidateReadingPaths(parsed.data.exerciseSlug);
  redirect(`/practice/reading/${parsed.data.exerciseSlug}/result/${data.id}`);
}

function revalidateReadingPaths(exerciseSlug: string) {
  revalidatePath("/practice/reading");
  revalidatePath(`/practice/reading/${exerciseSlug}`);
  revalidatePath("/progress");
  revalidatePath("/dashboard");
}
