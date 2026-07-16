import "server-only";

import {
  writingCorrectedExamplesSchema,
  writingCriterionRecordSchema,
  writingPriorityIssuesSchema,
  writingStringListSchema,
} from "@/features/writing/model";
import { writingRouteSchema } from "@/features/writing/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";
import { getWritingAiConfiguration } from "@/server/writing/ai-feedback";

export type WritingCatalogItem = {
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  testType: string;
  taskType: string;
  minimumWords: number;
  timeLimitSeconds: number;
  activeDraftId: string | null;
  latestSubmissionId: string | null;
};

export type WritingPracticePageData = {
  task: {
    id: string;
    slug: string;
    versionId: string;
    title: string;
    description: string;
    promptText: string;
    instructions: string;
    difficulty: string;
    testType: string;
    taskType: string;
    wordTarget: number;
    minimumWords: number;
    maximumWords: number;
    timeLimitSeconds: number;
    sourceName: string;
    licence: string;
  };
  submission: {
    id: string;
    draftText: string;
    serverRevision: number;
    wordCount: number;
    minimumWordsMet: boolean;
    startedAt: string;
    expiresAt: string;
    serverNow: string;
    lastSavedAt: string;
  } | null;
  latestSubmissionId: string | null;
};

export class WritingReadError extends Error {
  constructor(message = "Không thể đọc dữ liệu Writing.") {
    super(message);
    this.name = "WritingReadError";
  }
}

export async function getWritingCatalog(): Promise<WritingCatalogItem[]> {
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: tasks, error: tasksError } = await supabase
    .from("writing_tasks")
    .select("id, slug, display_order")
    .order("display_order");
  if (tasksError) throw new WritingReadError();
  if (tasks.length === 0) return [];

  const taskIds = tasks.map((task) => task.id);
  const [versionsResult, submissionsResult] = await Promise.all([
    supabase
      .from("writing_task_versions")
      .select(
        "writing_task_id, title, description, difficulty, test_type, task_type, minimum_words, time_limit_seconds, status, version",
      )
      .in("writing_task_id", taskIds)
      .eq("status", "published")
      .order("version", { ascending: false }),
    supabase
      .from("writing_submissions")
      .select("id, writing_task_id, status, created_at")
      .in("writing_task_id", taskIds)
      .order("created_at", { ascending: false }),
  ]);
  if (versionsResult.error || submissionsResult.error)
    throw new WritingReadError();

  return tasks.flatMap((task): WritingCatalogItem[] => {
    const version = versionsResult.data.find(
      (item) => item.writing_task_id === task.id,
    );
    if (!version) return [];
    const submissions = submissionsResult.data.filter(
      (item) => item.writing_task_id === task.id,
    );
    return [
      {
        slug: task.slug,
        title: version.title,
        description: version.description,
        difficulty: version.difficulty,
        testType: version.test_type,
        taskType: version.task_type,
        minimumWords: version.minimum_words,
        timeLimitSeconds: version.time_limit_seconds,
        activeDraftId:
          submissions.find((item) => item.status === "draft")?.id ?? null,
        latestSubmissionId:
          submissions.find((item) => item.status === "submitted")?.id ?? null,
      },
    ];
  });
}

export async function getWritingPracticePage(
  taskSlug: string,
): Promise<WritingPracticePageData | null> {
  const route = writingRouteSchema.pick({ taskSlug: true }).safeParse({
    taskSlug,
  });
  if (!route.success) return null;
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: task, error: taskError } = await supabase
    .from("writing_tasks")
    .select("id, slug")
    .eq("slug", route.data.taskSlug)
    .maybeSingle();
  if (taskError) throw new WritingReadError();
  if (!task) return null;

  const [versionsResult, submissionsResult] = await Promise.all([
    supabase
      .from("writing_task_versions")
      .select("*")
      .eq("writing_task_id", task.id)
      .order("version", { ascending: false }),
    supabase
      .from("writing_submissions")
      .select("*")
      .eq("writing_task_id", task.id)
      .order("created_at", { ascending: false }),
  ]);
  if (versionsResult.error || submissionsResult.error)
    throw new WritingReadError();
  const activeSubmission = submissionsResult.data.find(
    (item) => item.status === "draft",
  );
  const version =
    versionsResult.data.find(
      (item) => item.id === activeSubmission?.writing_task_version_id,
    ) ?? versionsResult.data.find((item) => item.status === "published");
  if (!version) return null;

  const { data: clock, error: clockError } = activeSubmission
    ? await supabase.rpc("get_writing_submission_clock", {
        p_submission_id: activeSubmission.id,
      })
    : { data: [], error: null };
  if (clockError) throw new WritingReadError();

  return {
    task: {
      id: task.id,
      slug: task.slug,
      versionId: version.id,
      title: version.title,
      description: version.description,
      promptText: version.prompt_text,
      instructions: version.instructions,
      difficulty: version.difficulty,
      testType: version.test_type,
      taskType: version.task_type,
      wordTarget: version.word_target,
      minimumWords: version.minimum_words,
      maximumWords: version.maximum_words,
      timeLimitSeconds: version.time_limit_seconds,
      sourceName: version.source_name,
      licence: version.licence,
    },
    submission:
      activeSubmission && clock?.[0]
        ? {
            id: activeSubmission.id,
            draftText: activeSubmission.draft_text,
            serverRevision: activeSubmission.server_revision,
            wordCount: activeSubmission.word_count,
            minimumWordsMet: activeSubmission.minimum_words_met,
            startedAt: clock[0].started_at,
            expiresAt: clock[0].expires_at,
            serverNow: clock[0].server_now,
            lastSavedAt: activeSubmission.last_saved_at,
          }
        : null,
    latestSubmissionId:
      submissionsResult.data.find((item) => item.status === "submitted")?.id ??
      null,
  };
}

export async function getWritingSubmissionReview(
  taskSlug: string,
  submissionId: string,
) {
  const route = writingRouteSchema.safeParse({ taskSlug, submissionId });
  if (!route.success || !route.data.submissionId) return null;
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: task, error: taskError } = await supabase
    .from("writing_tasks")
    .select("id, slug")
    .eq("slug", route.data.taskSlug)
    .maybeSingle();
  if (taskError) throw new WritingReadError();
  if (!task) return null;

  const { data: submission, error: submissionError } = await supabase
    .from("writing_submissions")
    .select("*")
    .eq("id", route.data.submissionId)
    .eq("writing_task_id", task.id)
    .eq("status", "submitted")
    .maybeSingle();
  if (submissionError) throw new WritingReadError();
  if (!submission || !submission.submitted_text || !submission.submitted_at)
    return null;

  const [versionResult, runsResult, aiStateResult] = await Promise.all([
    supabase
      .from("writing_task_versions")
      .select("*")
      .eq("id", submission.writing_task_version_id)
      .maybeSingle(),
    supabase
      .from("writing_feedback_runs")
      .select("*")
      .eq("submission_id", submission.id)
      .order("requested_at", { ascending: false }),
    supabase.rpc("get_writing_ai_configuration_state"),
  ]);
  if (versionResult.error || runsResult.error || aiStateResult.error)
    throw new WritingReadError();
  if (!versionResult.data) return null;

  const readyRun = runsResult.data.find((run) => run.status === "ready");
  const { data: feedback, error: feedbackError } = readyRun
    ? await supabase
        .from("writing_feedback")
        .select("*")
        .eq("run_id", readyRun.id)
        .maybeSingle()
    : { data: null, error: null };
  if (feedbackError) throw new WritingReadError();

  return {
    task: {
      slug: task.slug,
      title: versionResult.data.title,
      promptText: versionResult.data.prompt_text,
      instructions: versionResult.data.instructions,
      minimumWords: versionResult.data.minimum_words,
    },
    submission: {
      id: submission.id,
      text: submission.submitted_text,
      wordCount: submission.word_count,
      minimumWordsMet: submission.minimum_words_met,
      submittedAt: submission.submitted_at,
      submittedAfterTimeLimit: submission.submitted_after_time_limit ?? false,
    },
    feedbackRun: runsResult.data[0]
      ? {
          status: runsResult.data[0].status,
          errorCode: runsResult.data[0].error_code,
          requestedAt: runsResult.data[0].requested_at,
          attemptNumber: runsResult.data[0].attempt_number,
        }
      : null,
    feedback: feedback
      ? {
          overallBandEstimate: feedback.overall_band_estimate,
          confidence: feedback.confidence,
          summary: feedback.summary,
          criteria: writingCriterionRecordSchema.parse(feedback.criteria),
          strengths: writingStringListSchema.parse(feedback.strengths),
          priorityIssues: writingPriorityIssuesSchema.parse(
            feedback.priority_issues,
          ),
          revisionPlan: writingStringListSchema.parse(feedback.revision_plan),
          correctedExamples: writingCorrectedExamplesSchema.parse(
            feedback.corrected_examples,
          ),
          createdAt: feedback.created_at,
        }
      : null,
    aiAvailable:
      Boolean(aiStateResult.data) && Boolean(getWritingAiConfiguration()),
  };
}

export async function getRecentWritingSubmissions(limit = 8) {
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: submissions, error } = await supabase
    .from("writing_submissions")
    .select(
      "id, writing_task_id, writing_task_version_id, word_count, submitted_at",
    )
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw new WritingReadError();
  if (submissions.length === 0) return [];

  const [tasksResult, versionsResult] = await Promise.all([
    supabase
      .from("writing_tasks")
      .select("id, slug")
      .in(
        "id",
        submissions.map((item) => item.writing_task_id),
      ),
    supabase
      .from("writing_task_versions")
      .select("id, title")
      .in(
        "id",
        submissions.map((item) => item.writing_task_version_id),
      ),
  ]);
  if (tasksResult.error || versionsResult.error) throw new WritingReadError();
  const tasks = new Map(tasksResult.data.map((item) => [item.id, item]));
  const versions = new Map(versionsResult.data.map((item) => [item.id, item]));
  return submissions.flatMap((submission) => {
    const task = tasks.get(submission.writing_task_id);
    const version = versions.get(submission.writing_task_version_id);
    if (!task || !version || !submission.submitted_at) return [];
    return [
      {
        id: submission.id,
        taskSlug: task.slug,
        title: version.title,
        wordCount: submission.word_count,
        submittedAt: submission.submitted_at,
      },
    ];
  });
}

export type WritingSubmissionReviewData = NonNullable<
  Awaited<ReturnType<typeof getWritingSubmissionReview>>
>;
