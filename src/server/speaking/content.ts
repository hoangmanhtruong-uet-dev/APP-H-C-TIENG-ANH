import "server-only";

import {
  speakingRouteSchema,
  speakingSlugSchema,
} from "@/features/speaking/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";
import { getSpeakingAiConfiguration } from "@/server/speaking/ai-review";

export type SpeakingCatalogItem = {
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  testType: string;
  estimatedMinutes: number;
  promptCount: number;
  activeAttemptId: string | null;
  latestAttemptId: string | null;
};

export class SpeakingReadError extends Error {
  constructor() {
    super("Không thể đọc dữ liệu Speaking.");
    this.name = "SpeakingReadError";
  }
}

export async function getSpeakingCatalog(): Promise<SpeakingCatalogItem[]> {
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: sets, error } = await supabase
    .from("speaking_sets")
    .select("id, slug, display_order")
    .order("display_order");
  if (error) throw new SpeakingReadError();
  if (sets.length === 0) return [];
  const setIds = sets.map((item) => item.id);
  const [versionsResult, attemptsResult] = await Promise.all([
    supabase
      .from("speaking_set_versions")
      .select(
        "id, speaking_set_id, title, description, difficulty, test_type, estimated_minutes, status, version",
      )
      .in("speaking_set_id", setIds)
      .eq("status", "published")
      .order("version", { ascending: false }),
    supabase
      .from("speaking_attempts")
      .select("id, speaking_set_id, status, created_at")
      .in("speaking_set_id", setIds)
      .order("created_at", { ascending: false }),
  ]);
  if (versionsResult.error || attemptsResult.error)
    throw new SpeakingReadError();
  const versionIds = versionsResult.data.map((item) => item.id);
  const { data: prompts, error: promptError } = versionIds.length
    ? await supabase
        .from("speaking_prompts")
        .select("speaking_set_version_id")
        .in("speaking_set_version_id", versionIds)
    : { data: [], error: null };
  if (promptError) throw new SpeakingReadError();
  return sets.flatMap((set): SpeakingCatalogItem[] => {
    const version = versionsResult.data.find(
      (item) => item.speaking_set_id === set.id,
    );
    if (!version) return [];
    const attempts = attemptsResult.data.filter(
      (item) => item.speaking_set_id === set.id,
    );
    return [
      {
        slug: set.slug,
        title: version.title,
        description: version.description,
        difficulty: version.difficulty,
        testType: version.test_type,
        estimatedMinutes: version.estimated_minutes,
        promptCount: prompts.filter(
          (item) => item.speaking_set_version_id === version.id,
        ).length,
        activeAttemptId:
          attempts.find((item) => item.status === "in_progress")?.id ?? null,
        latestAttemptId:
          attempts.find((item) => item.status === "submitted")?.id ?? null,
      },
    ];
  });
}

export async function getSpeakingPracticePage(setSlug: string) {
  const parsed = speakingSlugSchema.safeParse(setSlug);
  if (!parsed.success) return null;
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: set, error } = await supabase
    .from("speaking_sets")
    .select("id, slug")
    .eq("slug", parsed.data)
    .maybeSingle();
  if (error) throw new SpeakingReadError();
  if (!set) return null;
  const [attemptsResult, versionsResult] = await Promise.all([
    supabase
      .from("speaking_attempts")
      .select("*")
      .eq("speaking_set_id", set.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("speaking_set_versions")
      .select("*")
      .eq("speaking_set_id", set.id)
      .order("version", { ascending: false }),
  ]);
  if (attemptsResult.error || versionsResult.error)
    throw new SpeakingReadError();
  const attempt = attemptsResult.data.find(
    (item) => item.status === "in_progress",
  );
  const version =
    versionsResult.data.find(
      (item) => item.id === attempt?.speaking_set_version_id,
    ) ?? versionsResult.data.find((item) => item.status === "published");
  if (!version) return null;
  const [promptsResult, responsesResult] = await Promise.all([
    supabase
      .from("speaking_prompts")
      .select("*")
      .eq("speaking_set_version_id", version.id)
      .order("display_order"),
    attempt
      ? supabase
          .from("speaking_responses")
          .select("id, prompt_id, audio_asset_id")
          .eq("attempt_id", attempt.id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (promptsResult.error || responsesResult.error)
    throw new SpeakingReadError();
  const responseRows = responsesResult.data ?? [];
  const assetIds = responseRows.flatMap((item) =>
    item.audio_asset_id ? [item.audio_asset_id] : [],
  );
  const { data: assets, error: assetsError } = assetIds.length
    ? await supabase
        .from("speaking_audio_assets")
        .select("id, bucket_id, storage_path, duration_seconds, status")
        .in("id", assetIds)
    : { data: [], error: null };
  if (assetsError) throw new SpeakingReadError();
  const audioUrls = new Map<string, string>();
  await Promise.all(
    assets
      .filter((asset) => asset.status === "ready")
      .map(async (asset) => {
        const { data } = await supabase.storage
          .from(asset.bucket_id)
          .createSignedUrl(asset.storage_path, 600);
        if (data?.signedUrl) audioUrls.set(asset.id, data.signedUrl);
      }),
  );
  return {
    set: {
      slug: set.slug,
      title: version.title,
      description: version.description,
      instructions: version.instructions,
      difficulty: version.difficulty,
      testType: version.test_type,
      estimatedMinutes: version.estimated_minutes,
      sourceName: version.source_name,
      licence: version.licence,
    },
    attempt: attempt ? { id: attempt.id, startedAt: attempt.started_at } : null,
    latestAttemptId:
      attemptsResult.data.find((item) => item.status === "submitted")?.id ??
      null,
    prompts: promptsResult.data.map((prompt) => {
      const response = responseRows.find(
        (item) => item.prompt_id === prompt.id,
      );
      const asset = assets.find(
        (item) =>
          item.id === response?.audio_asset_id && item.status === "ready",
      );
      return {
        id: prompt.id,
        part: prompt.part,
        text: prompt.prompt_text,
        instructions: prompt.instructions,
        preparationSeconds: prompt.preparation_seconds,
        minimumAnswerSeconds: prompt.minimum_answer_seconds,
        maximumAnswerSeconds: prompt.maximum_answer_seconds,
        required: prompt.is_required,
        verifiedAudio: asset
          ? {
              durationSeconds: Number(asset.duration_seconds),
              signedUrl: audioUrls.get(asset.id) ?? null,
            }
          : null,
      };
    }),
  };
}

export async function getSpeakingAttemptReview(
  setSlug: string,
  attemptId: string,
) {
  const parsed = speakingRouteSchema.safeParse({ setSlug, attemptId });
  if (!parsed.success || !parsed.data.attemptId) return null;
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: set, error: setError } = await supabase
    .from("speaking_sets")
    .select("id, slug")
    .eq("slug", parsed.data.setSlug)
    .maybeSingle();
  if (setError || !set) return null;
  const { data: attempt, error } = await supabase
    .from("speaking_attempts")
    .select("*")
    .eq("id", parsed.data.attemptId)
    .eq("speaking_set_id", set.id)
    .eq("status", "submitted")
    .maybeSingle();
  if (error) throw new SpeakingReadError();
  if (!attempt || !attempt.submitted_at) return null;
  const [
    versionResult,
    promptsResult,
    responsesResult,
    runsResult,
    feedbackRunsResult,
    dbConfigResult,
  ] = await Promise.all([
    supabase
      .from("speaking_set_versions")
      .select("title, description, instructions")
      .eq("id", attempt.speaking_set_version_id)
      .maybeSingle(),
    supabase
      .from("speaking_prompts")
      .select("id, part, prompt_text, display_order")
      .eq("speaking_set_version_id", attempt.speaking_set_version_id)
      .order("display_order"),
    supabase
      .from("speaking_responses")
      .select("id, prompt_id, audio_asset_id")
      .eq("attempt_id", attempt.id),
    supabase
      .from("speaking_transcript_runs")
      .select("id, response_id, status, error_code, requested_at")
      .order("requested_at", { ascending: false }),
    supabase
      .from("speaking_feedback_runs")
      .select("id, status, error_code, requested_at")
      .eq("attempt_id", attempt.id)
      .order("requested_at", { ascending: false }),
    supabase.rpc("get_speaking_pipeline_configuration_state"),
  ]);
  if (
    versionResult.error ||
    promptsResult.error ||
    responsesResult.error ||
    runsResult.error ||
    feedbackRunsResult.error ||
    dbConfigResult.error ||
    !versionResult.data
  ) {
    throw new SpeakingReadError();
  }
  const assetIds = responsesResult.data.flatMap((item) =>
    item.audio_asset_id ? [item.audio_asset_id] : [],
  );
  const responseIds = responsesResult.data.map((item) => item.id);
  const [assetsResult, transcriptsResult] = await Promise.all([
    assetIds.length
      ? supabase
          .from("speaking_audio_assets")
          .select("id, bucket_id, storage_path, duration_seconds")
          .in("id", assetIds)
      : Promise.resolve({ data: [], error: null }),
    responseIds.length
      ? supabase
          .from("speaking_transcripts")
          .select("response_id, transcript_text, created_at")
          .in("response_id", responseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (assetsResult.error || transcriptsResult.error)
    throw new SpeakingReadError();
  const urls = new Map<string, string>();
  await Promise.all(
    (assetsResult.data ?? []).map(async (asset) => {
      const { data } = await supabase.storage
        .from(asset.bucket_id)
        .createSignedUrl(asset.storage_path, 600);
      if (data?.signedUrl) urls.set(asset.id, data.signedUrl);
    }),
  );
  const readyFeedbackRun = feedbackRunsResult.data.find(
    (item) => item.status === "ready",
  );
  const { data: feedback, error: feedbackError } = readyFeedbackRun
    ? await supabase
        .from("speaking_feedback")
        .select("*")
        .eq("run_id", readyFeedbackRun.id)
        .maybeSingle()
    : { data: null, error: null };
  if (feedbackError) throw new SpeakingReadError();
  return {
    set: {
      slug: set.slug,
      title: versionResult.data.title,
      description: versionResult.data.description,
    },
    attempt: { id: attempt.id, submittedAt: attempt.submitted_at },
    responses: promptsResult.data.map((prompt) => {
      const response = responsesResult.data.find(
        (item) => item.prompt_id === prompt.id,
      );
      const asset = assetsResult.data?.find(
        (item) => item.id === response?.audio_asset_id,
      );
      const transcript = transcriptsResult.data?.find(
        (item) => item.response_id === response?.id,
      );
      const latestRun = runsResult.data.find(
        (item) => item.response_id === response?.id,
      );
      return {
        id: response?.id ?? prompt.id,
        part: prompt.part,
        prompt: prompt.prompt_text,
        durationSeconds: asset ? Number(asset.duration_seconds) : null,
        signedUrl: asset ? (urls.get(asset.id) ?? null) : null,
        transcript: transcript?.transcript_text ?? null,
        transcriptStatus: transcript
          ? "ready"
          : (latestRun?.status ?? "not_requested"),
      };
    }),
    feedbackRun: feedbackRunsResult.data[0] ?? null,
    feedback: feedback
      ? {
          estimatedOverallBand: feedback.estimated_overall_band
            ? Number(feedback.estimated_overall_band)
            : null,
          estimatedFluencyBand: feedback.estimated_fluency_band
            ? Number(feedback.estimated_fluency_band)
            : null,
          estimatedLexicalBand: feedback.estimated_lexical_band
            ? Number(feedback.estimated_lexical_band)
            : null,
          estimatedGrammarBand: feedback.estimated_grammar_band
            ? Number(feedback.estimated_grammar_band)
            : null,
          estimatedPronunciationBand: feedback.estimated_pronunciation_band
            ? Number(feedback.estimated_pronunciation_band)
            : null,
          pronunciationScope: feedback.pronunciation_scope,
          confidence: feedback.confidence,
          summary: feedback.summary,
          criteria: feedback.criteria,
          strengths: feedback.strengths,
          suggestions: feedback.suggestions,
          disclaimer: feedback.disclaimer,
        }
      : null,
    aiAvailable:
      Boolean(dbConfigResult.data) && Boolean(getSpeakingAiConfiguration()),
  };
}

export async function getRecentSpeakingAttempts(limit = 8) {
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: attempts, error } = await supabase
    .from("speaking_attempts")
    .select("id, speaking_set_id, speaking_set_version_id, submitted_at")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw new SpeakingReadError();
  if (attempts.length === 0) return [];
  const [setsResult, versionsResult, responsesResult] = await Promise.all([
    supabase
      .from("speaking_sets")
      .select("id, slug")
      .in(
        "id",
        attempts.map((item) => item.speaking_set_id),
      ),
    supabase
      .from("speaking_set_versions")
      .select("id, title")
      .in(
        "id",
        attempts.map((item) => item.speaking_set_version_id),
      ),
    supabase
      .from("speaking_responses")
      .select("attempt_id")
      .in(
        "attempt_id",
        attempts.map((item) => item.id),
      ),
  ]);
  if (setsResult.error || versionsResult.error || responsesResult.error)
    throw new SpeakingReadError();
  return attempts.flatMap((attempt) => {
    const set = setsResult.data.find(
      (item) => item.id === attempt.speaking_set_id,
    );
    const version = versionsResult.data.find(
      (item) => item.id === attempt.speaking_set_version_id,
    );
    if (!set || !version || !attempt.submitted_at) return [];
    return [
      {
        id: attempt.id,
        setSlug: set.slug,
        title: version.title,
        responseCount: responsesResult.data.filter(
          (item) => item.attempt_id === attempt.id,
        ).length,
        submittedAt: attempt.submitted_at,
      },
    ];
  });
}

export type SpeakingPracticeData = NonNullable<
  Awaited<ReturnType<typeof getSpeakingPracticePage>>
>;
export type SpeakingReviewData = NonNullable<
  Awaited<ReturnType<typeof getSpeakingAttemptReview>>
>;
