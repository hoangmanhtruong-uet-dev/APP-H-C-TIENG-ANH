import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isQuestionType,
  practiceResultSchema,
  type PracticeResult,
  type QuestionType,
} from "@/features/practice/model";
import { learningSlugSchema } from "@/features/learning/schemas";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export type PracticeOption = {
  id: string;
  label: string;
  position: number;
};

export type PracticeQuestion = {
  id: string;
  position: number;
  type: QuestionType;
  promptMarkdown: string;
  points: number;
  options: PracticeOption[];
  answer: {
    text: string | null;
    selectedOptionIds: string[];
    clientRevision: number;
  } | null;
};

export type PracticePageData = {
  exercise: {
    id: string;
    slug: string;
    domain: "vocabulary" | "grammar";
    versionId: string;
    title: string;
    summary: string;
    instructionsMarkdown: string;
    difficulty: string;
  };
  attempt: {
    id: string;
    status: "in_progress";
    currentQuestionPosition: number;
    lastSavedAt: string;
  } | null;
  latestResult: {
    id: string;
    score: number;
    maxScore: number;
    submittedAt: string;
  } | null;
  questions: PracticeQuestion[];
  activeQuestion: PracticeQuestion;
};

export type AttemptHistoryItem = {
  id: string;
  exerciseSlug: string;
  title: string;
  domain: "vocabulary" | "grammar" | "reading";
  score: number;
  maxScore: number;
  submittedAt: string;
};

export class PracticeReadError extends Error {
  constructor(message = "Không thể đọc bài luyện tập.") {
    super(message);
    this.name = "PracticeReadError";
  }
}

export async function getPracticePage(
  exerciseSlug: string,
  requestedPosition?: number,
): Promise<PracticePageData | null> {
  if (!learningSlugSchema.safeParse(exerciseSlug).success) return null;
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();

  const { data: exercise, error: exerciseError } = await supabase
    .from("exercise_sets")
    .select("id, slug, domain")
    .eq("slug", exerciseSlug)
    .maybeSingle();
  if (exerciseError) throw new PracticeReadError();
  if (
    !exercise ||
    (exercise.domain !== "vocabulary" && exercise.domain !== "grammar")
  ) {
    return null;
  }

  const [versionsResult, attemptsResult] = await Promise.all([
    supabase
      .from("exercise_set_versions")
      .select(
        "id, exercise_set_id, title, summary, instructions_markdown, difficulty, status, version",
      )
      .eq("exercise_set_id", exercise.id)
      .order("version", { ascending: false }),
    supabase
      .from("learner_attempts")
      .select(
        "id, exercise_set_version_id, status, current_question_position, last_saved_at, score, max_score, submitted_at, created_at",
      )
      .eq("exercise_set_id", exercise.id)
      .order("created_at", { ascending: false }),
  ]);
  if (versionsResult.error || attemptsResult.error)
    throw new PracticeReadError();

  const activeAttempt = attemptsResult.data.find(
    (item) => item.status === "in_progress",
  );
  const latestScored = attemptsResult.data.find(
    (item) => item.status === "scored",
  );
  const version =
    versionsResult.data.find(
      (item) => item.id === activeAttempt?.exercise_set_version_id,
    ) ?? versionsResult.data.find((item) => item.status === "published");
  if (!version) return null;

  const [questionsResult, optionsResult, answersResult] = await Promise.all([
    supabase
      .from("exercise_questions")
      .select(
        "id, exercise_set_version_id, position, question_type, prompt_markdown, points",
      )
      .eq("exercise_set_version_id", version.id)
      .order("position"),
    supabase
      .from("exercise_options")
      .select("id, question_id, position, label")
      .order("position"),
    activeAttempt
      ? supabase
          .from("learner_answers")
          .select("id, question_id, answer_text, client_revision")
          .eq("attempt_id", activeAttempt.id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (questionsResult.error || optionsResult.error || answersResult.error) {
    throw new PracticeReadError();
  }

  const selectionsResult = activeAttempt
    ? await supabase
        .from("learner_answer_options")
        .select("answer_id, option_id")
        .eq("attempt_id", activeAttempt.id)
    : { data: [], error: null };
  if (selectionsResult.error) throw new PracticeReadError();

  const answerByQuestion = new Map(
    answersResult.data.map((answer) => [answer.question_id, answer]),
  );
  const selectionsByAnswer = new Map<string, string[]>();
  for (const selection of selectionsResult.data) {
    const current = selectionsByAnswer.get(selection.answer_id) ?? [];
    current.push(selection.option_id);
    selectionsByAnswer.set(selection.answer_id, current);
  }

  const questions = questionsResult.data.flatMap(
    (question): PracticeQuestion[] => {
      if (!isQuestionType(question.question_type)) return [];
      const answer = answerByQuestion.get(question.id);
      return [
        {
          id: question.id,
          position: question.position,
          type: question.question_type,
          promptMarkdown: question.prompt_markdown,
          points: question.points,
          options: optionsResult.data
            .filter((option) => option.question_id === question.id)
            .map((option) => ({
              id: option.id,
              label: option.label,
              position: option.position,
            })),
          answer: answer
            ? {
                text: answer.answer_text,
                selectedOptionIds: selectionsByAnswer.get(answer.id) ?? [],
                clientRevision: answer.client_revision,
              }
            : null,
        },
      ];
    },
  );
  if (questions.length === 0) return null;
  const activePosition = Number.isInteger(requestedPosition)
    ? requestedPosition!
    : (activeAttempt?.current_question_position ?? 1);
  const activeQuestion =
    questions.find((question) => question.position === activePosition) ??
    questions[0];

  return {
    exercise: {
      id: exercise.id,
      slug: exercise.slug,
      domain: exercise.domain,
      versionId: version.id,
      title: version.title,
      summary: version.summary,
      instructionsMarkdown: version.instructions_markdown,
      difficulty: version.difficulty,
    },
    attempt: activeAttempt
      ? {
          id: activeAttempt.id,
          status: "in_progress",
          currentQuestionPosition: activeAttempt.current_question_position,
          lastSavedAt: activeAttempt.last_saved_at,
        }
      : null,
    latestResult:
      latestScored?.score != null &&
      latestScored.max_score != null &&
      latestScored.submitted_at
        ? {
            id: latestScored.id,
            score: latestScored.score,
            maxScore: latestScored.max_score,
            submittedAt: latestScored.submitted_at,
          }
        : null,
    questions,
    activeQuestion,
  };
}

export async function getPracticeResult(attemptId: string) {
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_exercise_attempt_result", {
    p_attempt_id: attemptId,
  });
  if (error) return null;
  const parsed = practiceResultSchema.safeParse(data);
  if (!parsed.success)
    throw new PracticeReadError("Kết quả bài tập không hợp lệ.");

  const [setResult, versionResult, optionsResult] = await Promise.all([
    supabase
      .from("exercise_sets")
      .select("id, slug, domain")
      .eq("id", parsed.data.exerciseSetId)
      .maybeSingle(),
    supabase
      .from("exercise_set_versions")
      .select("id, title, summary")
      .eq("id", parsed.data.exerciseSetVersionId)
      .maybeSingle(),
    supabase
      .from("exercise_options")
      .select("id, question_id, label, position")
      .order("position"),
  ]);
  if (setResult.error || versionResult.error || optionsResult.error)
    throw new PracticeReadError();
  if (!setResult.data || !versionResult.data) return null;

  return {
    result: parsed.data,
    exercise: {
      slug: setResult.data.slug,
      domain: setResult.data.domain,
      title: versionResult.data.title,
      summary: versionResult.data.summary,
    },
    options: optionsResult.data,
  };
}

export async function getRecentAttemptHistory(
  limit = 8,
): Promise<AttemptHistoryItem[]> {
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: attempts, error } = await supabase
    .from("learner_attempts")
    .select(
      "id, exercise_set_id, exercise_set_version_id, score, max_score, submitted_at",
    )
    .eq("status", "scored")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw new PracticeReadError();
  if (attempts.length === 0) return [];

  const [setsResult, versionsResult] = await Promise.all([
    supabase.from("exercise_sets").select("id, slug, domain"),
    supabase.from("exercise_set_versions").select("id, title"),
  ]);
  if (setsResult.error || versionsResult.error) throw new PracticeReadError();
  const setById = new Map(setsResult.data.map((item) => [item.id, item]));
  const versionById = new Map(
    versionsResult.data.map((item) => [item.id, item]),
  );

  return attempts.flatMap((attempt): AttemptHistoryItem[] => {
    const set = setById.get(attempt.exercise_set_id);
    const version = versionById.get(attempt.exercise_set_version_id);
    if (
      !set ||
      !version ||
      attempt.score == null ||
      attempt.max_score == null ||
      !attempt.submitted_at
    )
      return [];
    if (
      set.domain !== "vocabulary" &&
      set.domain !== "grammar" &&
      set.domain !== "reading"
    )
      return [];
    return [
      {
        id: attempt.id,
        exerciseSlug: set.slug,
        title: version.title,
        domain: set.domain,
        score: attempt.score,
        maxScore: attempt.max_score,
        submittedAt: attempt.submitted_at,
      },
    ];
  });
}

export type { PracticeResult };
