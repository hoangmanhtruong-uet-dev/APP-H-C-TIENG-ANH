import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";
import type { Database } from "@/types/database";
import type {
  MockSectionType,
  MockSessionStatus,
} from "@/features/mock-tests/model";

type VersionRow = Database["public"]["Tables"]["mock_test_versions"]["Row"];
type SectionRow = Database["public"]["Tables"]["mock_test_sections"]["Row"];
type SectionAttemptRow =
  Database["public"]["Tables"]["mock_test_section_attempts"]["Row"];

export type MockCatalogItem = {
  slug: string;
  title: string;
  description: string;
  testType: string;
  difficulty: string;
  estimatedMinutes: number;
  sectionCount: number;
  activeSessionId: string | null;
  activeSessionStatus: MockSessionStatus | null;
};

export type MockSectionView = {
  id: string;
  type: MockSectionType;
  order: number;
  title: string;
  timeLimitSeconds: number;
  required: boolean;
  attempt: SectionAttemptRow | null;
  practicePath: string | null;
};

export type MockTestDetailData = {
  test: { id: string; slug: string; displayOrder: number };
  version: VersionRow;
  sections: MockSectionView[];
  activeSessionId: string | null;
  activeSessionStatus: MockSessionStatus | null;
};

export type MockSessionPageData = MockTestDetailData & {
  session: Database["public"]["Tables"]["mock_test_sessions"]["Row"] & {
    status: MockSessionStatus;
  };
  result: Database["public"]["Tables"]["mock_test_results"]["Row"] | null;
};

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function resolveSections(
  sections: SectionRow[],
  attempts: SectionAttemptRow[],
  context?: { mockTestSlug: string; sessionId: string },
): Promise<MockSectionView[]> {
  const supabase = await createSupabaseServerClient();
  const attemptBySection = new Map(
    attempts.map((attempt) => [attempt.mock_test_section_id, attempt]),
  );

  return Promise.all(
    sections.map(async (section) => {
      let title = section.section_type;
      let rootSlug: string | null = null;

      if (section.exercise_set_version_id) {
        const { data } = await supabase
          .from("exercise_set_versions")
          .select("title, exercise_sets!inner(slug)")
          .eq("id", section.exercise_set_version_id)
          .maybeSingle();
        title = data?.title ?? title;
        rootSlug = relation(data?.exercise_sets ?? null)?.slug ?? null;
      } else if (section.writing_task_version_id) {
        const { data } = await supabase
          .from("writing_task_versions")
          .select("title, writing_tasks!inner(slug)")
          .eq("id", section.writing_task_version_id)
          .maybeSingle();
        title = data?.title ?? title;
        rootSlug = relation(data?.writing_tasks ?? null)?.slug ?? null;
      } else if (section.speaking_set_version_id) {
        const { data } = await supabase
          .from("speaking_set_versions")
          .select("title, speaking_sets!inner(slug)")
          .eq("id", section.speaking_set_version_id)
          .maybeSingle();
        title = data?.title ?? title;
        rootSlug = relation(data?.speaking_sets ?? null)?.slug ?? null;
      }

      const attempt = attemptBySection.get(section.id) ?? null;
      const params =
        context && attempt
          ? new URLSearchParams({
              mockTestSlug: context.mockTestSlug,
              mockSessionId: context.sessionId,
              mockSectionAttemptId: attempt.id,
            }).toString()
          : null;
      const practicePath =
        rootSlug && params
          ? `/practice/${section.section_type}/${rootSlug}?${params}`
          : null;

      return {
        id: section.id,
        type: section.section_type as MockSectionType,
        order: section.section_order,
        title,
        timeLimitSeconds: section.time_limit_seconds,
        required: section.required,
        attempt,
        practicePath,
      };
    }),
  );
}

export const getMockTestCatalog = cache(
  async (): Promise<MockCatalogItem[]> => {
    const { account } = await requireCompletedOnboarding();
    const supabase = await createSupabaseServerClient();
    const [{ data: versions, error }, { data: sessions }] = await Promise.all([
      supabase
        .from("mock_test_versions")
        .select(
          "id, mock_test_id, title, description, test_type, difficulty, estimated_minutes, mock_tests!inner(slug, display_order)",
        )
        .eq("status", "published"),
      supabase
        .from("mock_test_sessions")
        .select("id, mock_test_id, status")
        .eq("user_id", account.user.id)
        .in("status", ["in_progress", "submitted"]),
    ]);
    if (error) throw new Error("Không thể tải danh sách mock test.");

    const sessionByTest = new Map(
      (sessions ?? []).map((session) => [session.mock_test_id, session]),
    );
    return Promise.all(
      (versions ?? []).map(async (version) => {
        const root = relation(version.mock_tests);
        const { count } = await supabase
          .from("mock_test_sections")
          .select("id", { count: "exact", head: true })
          .eq("mock_test_version_id", version.id);
        const session = sessionByTest.get(version.mock_test_id);
        return {
          slug: root?.slug ?? "",
          title: version.title,
          description: version.description,
          testType: version.test_type,
          difficulty: version.difficulty,
          estimatedMinutes: version.estimated_minutes,
          sectionCount: count ?? 0,
          activeSessionId: session?.id ?? null,
          activeSessionStatus:
            (session?.status as MockSessionStatus | undefined) ?? null,
        };
      }),
    );
  },
);

export async function getMockTestDetail(
  slug: string,
): Promise<MockTestDetailData | null> {
  const { account } = await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: test } = await supabase
    .from("mock_tests")
    .select("id, slug, display_order")
    .eq("slug", slug)
    .maybeSingle();
  if (!test) return null;
  const [{ data: version }, { data: activeSession }] = await Promise.all([
    supabase
      .from("mock_test_versions")
      .select("*")
      .eq("mock_test_id", test.id)
      .eq("status", "published")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("mock_test_sessions")
      .select("id, status")
      .eq("user_id", account.user.id)
      .eq("mock_test_id", test.id)
      .in("status", ["in_progress", "submitted"])
      .maybeSingle(),
  ]);
  if (!version) return null;
  const { data: sectionRows, error } = await supabase
    .from("mock_test_sections")
    .select("*")
    .eq("mock_test_version_id", version.id)
    .order("section_order");
  if (error) throw new Error("Không thể tải cấu trúc mock test.");
  return {
    test: { id: test.id, slug: test.slug, displayOrder: test.display_order },
    version,
    sections: await resolveSections(sectionRows ?? [], []),
    activeSessionId: activeSession?.id ?? null,
    activeSessionStatus:
      (activeSession?.status as MockSessionStatus | undefined) ?? null,
  };
}

export async function getMockSessionPage(
  slug: string,
  sessionId: string,
): Promise<MockSessionPageData | null> {
  const { account } = await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("mock_test_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", account.user.id)
    .maybeSingle();
  if (!session) return null;
  const [
    { data: test },
    { data: version },
    { data: sectionRows },
    { data: attempts },
    { data: result },
  ] = await Promise.all([
    supabase
      .from("mock_tests")
      .select("id, slug, display_order")
      .eq("id", session.mock_test_id)
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("mock_test_versions")
      .select("*")
      .eq("id", session.mock_test_version_id)
      .maybeSingle(),
    supabase
      .from("mock_test_sections")
      .select("*")
      .eq("mock_test_version_id", session.mock_test_version_id)
      .order("section_order"),
    supabase
      .from("mock_test_section_attempts")
      .select("*")
      .eq("session_id", session.id),
    supabase
      .from("mock_test_results")
      .select("*")
      .eq("session_id", session.id)
      .maybeSingle(),
  ]);
  if (!test || !version || !sectionRows) return null;
  return {
    test: { id: test.id, slug: test.slug, displayOrder: test.display_order },
    version,
    sections: await resolveSections(sectionRows, attempts ?? [], {
      mockTestSlug: slug,
      sessionId,
    }),
    activeSessionId: session.id,
    activeSessionStatus: session.status as MockSessionStatus,
    session: {
      ...session,
      status: session.status as MockSessionStatus,
    },
    result: result ?? null,
  };
}
