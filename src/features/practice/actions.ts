"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  savePracticeAnswerSchema,
  startPracticeSchema,
  submitPracticeSchema,
} from "@/features/practice/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export async function startPracticeAction(formData: FormData) {
  const parsed = startPracticeSchema.safeParse({
    exerciseSlug: formData.get("exerciseSlug"),
  });
  if (!parsed.success) redirect("/learn?practiceError=invalid");
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("start_exercise_attempt", {
    p_exercise_slug: parsed.data.exerciseSlug,
    p_idempotency_key: randomUUID(),
  });
  if (error || !data)
    redirect(`/practice/${parsed.data.exerciseSlug}?error=start`);
  revalidatePracticePaths(parsed.data.exerciseSlug);
  redirect(`/practice/${parsed.data.exerciseSlug}?attempt=${data.id}`);
}

export async function savePracticeAnswerAction(formData: FormData) {
  const parsed = savePracticeAnswerSchema.safeParse({
    attemptId: formData.get("attemptId"),
    questionId: formData.get("questionId"),
    exerciseSlug: formData.get("exerciseSlug"),
    selectedOptionIds: formData.getAll("selectedOptionIds"),
    answerText: formData.get("answerText")?.toString(),
    clientRevision: formData.get("clientRevision"),
    nextPosition: formData.get("nextPosition"),
  });
  if (!parsed.success) redirect("/learn?practiceError=invalid-answer");
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_exercise_answer", {
    p_attempt_id: parsed.data.attemptId,
    p_question_id: parsed.data.questionId,
    p_selected_option_ids: parsed.data.selectedOptionIds,
    p_answer_text: parsed.data.answerText ?? "",
    p_client_revision: parsed.data.clientRevision,
  });
  if (error) {
    redirect(
      `/practice/${parsed.data.exerciseSlug}?question=${parsed.data.nextPosition}&error=save`,
    );
  }
  revalidatePracticePaths(parsed.data.exerciseSlug);
  redirect(
    `/practice/${parsed.data.exerciseSlug}?question=${parsed.data.nextPosition}&saved=1`,
  );
}

export async function submitPracticeAction(formData: FormData) {
  const parsed = submitPracticeSchema.safeParse({
    attemptId: formData.get("attemptId"),
    exerciseSlug: formData.get("exerciseSlug"),
  });
  if (!parsed.success) redirect("/learn?practiceError=invalid-submit");
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_exercise_attempt", {
    p_attempt_id: parsed.data.attemptId,
  });
  if (error || !data)
    redirect(`/practice/${parsed.data.exerciseSlug}?error=submit`);
  revalidatePracticePaths(parsed.data.exerciseSlug);
  redirect(`/practice/${parsed.data.exerciseSlug}/result/${data.id}`);
}

function revalidatePracticePaths(exerciseSlug: string) {
  revalidatePath(`/practice/${exerciseSlug}`);
  revalidatePath("/progress");
  revalidatePath("/dashboard");
}
