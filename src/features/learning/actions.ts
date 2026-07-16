"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  mapProgressError,
  type LearningProgressActionState,
} from "@/features/learning/action-state";
import { lessonProgressMutationSchema } from "@/features/learning/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export async function openLessonSectionAction(input: unknown) {
  return mutateLessonProgress("open", input);
}

export async function completeLessonSectionAction(
  _previousState: LearningProgressActionState,
  formData: FormData,
) {
  return mutateLessonProgress("complete", {
    lessonId: formData.get("lessonId"),
    sectionId: formData.get("sectionId"),
    moduleSlug: formData.get("moduleSlug"),
    lessonSlug: formData.get("lessonSlug"),
  });
}

async function mutateLessonProgress(
  operation: "open" | "complete",
  input: unknown,
): Promise<LearningProgressActionState> {
  const requestId = randomUUID();
  const parsed = lessonProgressMutationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Thông tin bài học không hợp lệ. Hãy tải lại trang và thử lại.",
      requestId,
    };
  }

  try {
    await requireCompletedOnboarding();
    const supabase = await createSupabaseServerClient();
    const functionName =
      operation === "complete"
        ? "complete_lesson_section"
        : "open_lesson_section";
    const { error } = await supabase.rpc(functionName, {
      p_lesson_id: parsed.data.lessonId,
      p_section_id: parsed.data.sectionId,
    });

    if (error) {
      return mapProgressError(error.code, requestId);
    }

    revalidateLearningPaths(parsed.data.moduleSlug, parsed.data.lessonSlug);
    return {
      status: "success",
      message:
        operation === "complete"
          ? "Tiến độ phần học đã được lưu."
          : "Vị trí đang học đã được lưu.",
      requestId,
    };
  } catch {
    return {
      status: "error",
      message: "Không thể lưu tiến độ lúc này. Hãy thử lại.",
      requestId,
    };
  }
}

function revalidateLearningPaths(moduleSlug: string, lessonSlug: string) {
  revalidatePath(`/learn/${moduleSlug}/${lessonSlug}`);
  revalidatePath(`/learn/${moduleSlug}`);
  revalidatePath("/learn");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
}
