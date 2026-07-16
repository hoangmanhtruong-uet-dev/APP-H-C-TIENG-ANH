import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isLearningDifficulty,
  isLearningSkill,
  isLearningTestType,
  isLessonSectionType,
  type LearningDifficulty,
  type LearningSkill,
  type LearningTestType,
  type LessonSectionType,
} from "@/features/learning/constants";
import {
  selectNextLesson,
  selectResumeSection,
} from "@/features/learning/model";
import { learningSlugSchema } from "@/features/learning/schemas";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";
import type { Tables } from "@/types/database";

type ModuleRow = Tables<"learning_modules">;
type LessonRow = Tables<"lessons">;
type LessonVersionRow = Tables<"lesson_versions">;
type LessonSectionRow = Tables<"lesson_sections">;
type LessonProgressRow = Tables<"learner_lesson_progress">;

export type LearningLessonSummary = {
  id: string;
  moduleId: string;
  moduleSlug: string;
  moduleTitle: string;
  moduleOrder: number;
  slug: string;
  lessonOrder: number;
  versionId: string;
  title: string;
  summary: string;
  difficulty: LearningDifficulty;
  estimatedMinutes: number;
  status: "not_started" | "in_progress" | "completed";
  progressPercent: number;
  currentSectionId: string | null;
  lastAccessedAt: string | null;
  completedAt: string | null;
  href: string;
};

export type LearningModuleSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  skill: LearningSkill;
  testType: LearningTestType;
  difficulty: LearningDifficulty;
  displayOrder: number;
  estimatedMinutes: number;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lessons: LearningLessonSummary[];
};

export type LessonSection = {
  id: string;
  type: LessonSectionType;
  title: string | null;
  bodyMarkdown: string;
  displayOrder: number;
  isRequired: boolean;
  completed: boolean;
  completedAt: string | null;
};

export type LessonReaderData = {
  module: Pick<
    LearningModuleSummary,
    "id" | "slug" | "title" | "description" | "skill" | "testType"
  >;
  lesson: LearningLessonSummary & {
    versionStatus: "published" | "archived";
  };
  sections: LessonSection[];
  activeSection: LessonSection;
  nextLesson: LearningLessonSummary | null;
};

export type LearningOverview = {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  progressPercent: number;
  continueLesson: LearningLessonSummary | null;
  nextLesson: LearningLessonSummary | null;
  recentLessons: LearningLessonSummary[];
};

export class LearningContentReadError extends Error {
  constructor(message = "Không thể đọc nội dung học tập.") {
    super(message);
    this.name = "LearningContentReadError";
  }
}

export async function getLearningCatalog() {
  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();

  const [modulesResult, lessonsResult, versionsResult, progressResult] =
    await Promise.all([
      supabase
        .from("learning_modules")
        .select(
          "id, slug, title, description, skill, test_type, difficulty, display_order, estimated_minutes, status",
        )
        .eq("status", "published")
        .order("display_order")
        .order("id"),
      supabase
        .from("lessons")
        .select("id, module_id, slug, display_order")
        .order("display_order")
        .order("id"),
      supabase
        .from("lesson_versions")
        .select(
          "id, lesson_id, title, summary, difficulty, estimated_minutes, status, published_at, version",
        )
        .eq("status", "published")
        .order("version", { ascending: false }),
      supabase
        .from("learner_lesson_progress")
        .select(
          "lesson_id, lesson_version_id, status, progress_percent, current_section_id, last_accessed_at, completed_at",
        ),
    ]);

  if (
    modulesResult.error ||
    lessonsResult.error ||
    versionsResult.error ||
    progressResult.error
  ) {
    throw new LearningContentReadError();
  }

  return assembleCatalog(
    modulesResult.data,
    lessonsResult.data,
    versionsResult.data,
    progressResult.data,
  );
}

export async function getLearningModule(moduleSlug: string) {
  if (!learningSlugSchema.safeParse(moduleSlug).success) return null;
  const modules = await getLearningCatalog();
  return modules.find((module) => module.slug === moduleSlug) ?? null;
}

export async function getLessonReader(
  moduleSlug: string,
  lessonSlug: string,
  requestedSectionOrder?: number,
): Promise<LessonReaderData | null> {
  if (
    !learningSlugSchema.safeParse(moduleSlug).success ||
    !learningSlugSchema.safeParse(lessonSlug).success
  ) {
    return null;
  }

  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { data: moduleRow, error: moduleError } = await supabase
    .from("learning_modules")
    .select(
      "id, slug, title, description, skill, test_type, difficulty, display_order, estimated_minutes, status",
    )
    .eq("slug", moduleSlug)
    .maybeSingle();

  if (moduleError) throw new LearningContentReadError();
  if (!moduleRow) return null;

  const { data: lessonRow, error: lessonError } = await supabase
    .from("lessons")
    .select("id, module_id, slug, display_order")
    .eq("module_id", moduleRow.id)
    .eq("slug", lessonSlug)
    .maybeSingle();

  if (lessonError) throw new LearningContentReadError();
  if (!lessonRow) return null;

  const [progressResult, versionsResult] = await Promise.all([
    supabase
      .from("learner_lesson_progress")
      .select(
        "lesson_id, lesson_version_id, status, progress_percent, current_section_id, last_accessed_at, completed_at",
      )
      .eq("lesson_id", lessonRow.id)
      .maybeSingle(),
    supabase
      .from("lesson_versions")
      .select(
        "id, lesson_id, title, summary, difficulty, estimated_minutes, status, published_at, version",
      )
      .eq("lesson_id", lessonRow.id)
      .order("version", { ascending: false }),
  ]);

  if (progressResult.error || versionsResult.error) {
    throw new LearningContentReadError();
  }

  const progress = progressResult.data;
  const version =
    versionsResult.data.find(
      (candidate) => candidate.id === progress?.lesson_version_id,
    ) ??
    versionsResult.data.find((candidate) => candidate.status === "published");

  if (
    !version ||
    (version.status !== "published" && version.status !== "archived")
  ) {
    return null;
  }

  const [sectionsResult, sectionProgressResult, catalog] = await Promise.all([
    supabase
      .from("lesson_sections")
      .select(
        "id, lesson_version_id, section_type, title, body_markdown, display_order, is_required",
      )
      .eq("lesson_version_id", version.id)
      .order("display_order")
      .order("id"),
    supabase
      .from("learner_section_progress")
      .select("section_id, completed_at")
      .eq("lesson_id", lessonRow.id),
    getLearningCatalog(),
  ]);

  if (sectionsResult.error || sectionProgressResult.error) {
    throw new LearningContentReadError();
  }

  const completedBySection = new Map(
    sectionProgressResult.data.map((item) => [
      item.section_id,
      item.completed_at,
    ]),
  );
  const sections = sectionsResult.data
    .map((section) => mapSection(section, completedBySection))
    .filter((section): section is LessonSection => Boolean(section));

  if (sections.length === 0) return null;

  const requestedSection = Number.isInteger(requestedSectionOrder)
    ? sections.find((section) => section.displayOrder === requestedSectionOrder)
    : null;
  const resumeSection = selectResumeSection(
    sections.map((section) => ({
      id: section.id,
      displayOrder: section.displayOrder,
      isRequired: section.isRequired,
      completed: section.completed,
    })),
    progress?.current_section_id ?? null,
  );
  const activeSection =
    requestedSection ??
    sections.find((section) => section.id === resumeSection?.id) ??
    sections[0];

  const moduleSummary = catalog.find((module) => module.id === moduleRow.id);
  const catalogLesson = moduleSummary?.lessons.find(
    (lesson) => lesson.id === lessonRow.id,
  );
  const lessonSummary = mapLesson(moduleRow, lessonRow, version, progress);

  const allLessons = catalog.flatMap((module) => module.lessons);
  const selectedNext = selectNextLesson(
    allLessons
      .filter((lesson) => lesson.id !== lessonRow.id)
      .map((lesson) => ({
        id: lesson.id,
        moduleOrder: lesson.moduleOrder,
        lessonOrder: lesson.lessonOrder,
        status: lesson.status,
        lastAccessedAt: lesson.lastAccessedAt,
      })),
  );

  return {
    module: {
      id: moduleRow.id,
      slug: moduleRow.slug,
      title: moduleRow.title,
      description: moduleRow.description,
      skill: normalizeSkill(moduleRow.skill),
      testType: normalizeTestType(moduleRow.test_type),
    },
    lesson: {
      ...(catalogLesson ?? lessonSummary),
      versionStatus: version.status,
    },
    sections,
    activeSection,
    nextLesson:
      allLessons.find((lesson) => lesson.id === selectedNext?.id) ?? null,
  };
}

export async function getLearningOverview(): Promise<LearningOverview> {
  const modules = await getLearningCatalog();
  return buildLearningOverview(modules);
}

export function buildLearningOverview(
  modules: LearningModuleSummary[],
): LearningOverview {
  const lessons = modules.flatMap((module) => module.lessons);
  const completedLessons = lessons.filter(
    (lesson) => lesson.status === "completed",
  ).length;
  const inProgressLessons = lessons.filter(
    (lesson) => lesson.status === "in_progress",
  ).length;
  const progressPercent =
    lessons.length === 0
      ? 0
      : Math.round(
          (lessons.reduce(
            (total, lesson) => total + lesson.progressPercent,
            0,
          ) /
            lessons.length) *
            100,
        ) / 100;
  const next = selectNextLesson(
    lessons.map((lesson) => ({
      id: lesson.id,
      moduleOrder: lesson.moduleOrder,
      lessonOrder: lesson.lessonOrder,
      status: lesson.status,
      lastAccessedAt: lesson.lastAccessedAt,
    })),
  );

  return {
    totalLessons: lessons.length,
    completedLessons,
    inProgressLessons,
    progressPercent,
    continueLesson:
      lessons
        .filter((lesson) => lesson.status === "in_progress")
        .sort(
          (left, right) =>
            new Date(right.lastAccessedAt ?? 0).getTime() -
            new Date(left.lastAccessedAt ?? 0).getTime(),
        )[0] ?? null,
    nextLesson: lessons.find((lesson) => lesson.id === next?.id) ?? null,
    recentLessons: lessons
      .filter((lesson) => lesson.lastAccessedAt)
      .sort(
        (left, right) =>
          new Date(right.lastAccessedAt ?? 0).getTime() -
          new Date(left.lastAccessedAt ?? 0).getTime(),
      )
      .slice(0, 5),
  };
}

function assembleCatalog(
  modules: Pick<
    ModuleRow,
    | "id"
    | "slug"
    | "title"
    | "description"
    | "skill"
    | "test_type"
    | "difficulty"
    | "display_order"
    | "estimated_minutes"
    | "status"
  >[],
  lessons: Pick<LessonRow, "id" | "module_id" | "slug" | "display_order">[],
  versions: Pick<
    LessonVersionRow,
    | "id"
    | "lesson_id"
    | "title"
    | "summary"
    | "difficulty"
    | "estimated_minutes"
    | "status"
    | "published_at"
    | "version"
  >[],
  progress: Pick<
    LessonProgressRow,
    | "lesson_id"
    | "lesson_version_id"
    | "status"
    | "progress_percent"
    | "current_section_id"
    | "last_accessed_at"
    | "completed_at"
  >[],
) {
  const publishedVersionByLesson = new Map<string, (typeof versions)[number]>();
  for (const version of versions) {
    if (!publishedVersionByLesson.has(version.lesson_id)) {
      publishedVersionByLesson.set(version.lesson_id, version);
    }
  }
  const progressByLesson = new Map(
    progress.map((item) => [item.lesson_id, item]),
  );

  return modules.map((moduleRow): LearningModuleSummary => {
    const moduleLessons = lessons
      .filter((lesson) => lesson.module_id === moduleRow.id)
      .flatMap((lesson) => {
        const version = publishedVersionByLesson.get(lesson.id);
        if (!version) return [];
        return [
          mapLesson(
            moduleRow,
            lesson,
            version,
            progressByLesson.get(lesson.id) ?? null,
          ),
        ];
      })
      .sort((left, right) => left.lessonOrder - right.lessonOrder);
    const completedLessons = moduleLessons.filter(
      (lesson) => lesson.status === "completed",
    ).length;
    const progressPercent =
      moduleLessons.length === 0
        ? 0
        : Math.round(
            (moduleLessons.reduce(
              (total, lesson) => total + lesson.progressPercent,
              0,
            ) /
              moduleLessons.length) *
              100,
          ) / 100;

    return {
      id: moduleRow.id,
      slug: moduleRow.slug,
      title: moduleRow.title,
      description: moduleRow.description,
      skill: normalizeSkill(moduleRow.skill),
      testType: normalizeTestType(moduleRow.test_type),
      difficulty: normalizeDifficulty(moduleRow.difficulty),
      displayOrder: moduleRow.display_order,
      estimatedMinutes: moduleRow.estimated_minutes,
      progressPercent,
      completedLessons,
      totalLessons: moduleLessons.length,
      lessons: moduleLessons,
    };
  });
}

function mapLesson(
  moduleRow: Pick<ModuleRow, "id" | "slug" | "title" | "display_order">,
  lesson: Pick<LessonRow, "id" | "slug" | "display_order">,
  version: Pick<
    LessonVersionRow,
    "id" | "title" | "summary" | "difficulty" | "estimated_minutes"
  >,
  progress: Pick<
    LessonProgressRow,
    | "status"
    | "progress_percent"
    | "current_section_id"
    | "last_accessed_at"
    | "completed_at"
  > | null,
): LearningLessonSummary {
  const status =
    progress?.status === "completed"
      ? "completed"
      : progress?.status === "in_progress"
        ? "in_progress"
        : "not_started";

  return {
    id: lesson.id,
    moduleId: moduleRow.id,
    moduleSlug: moduleRow.slug,
    moduleTitle: moduleRow.title,
    moduleOrder: moduleRow.display_order,
    slug: lesson.slug,
    lessonOrder: lesson.display_order,
    versionId: version.id,
    title: version.title,
    summary: version.summary,
    difficulty: normalizeDifficulty(version.difficulty),
    estimatedMinutes: version.estimated_minutes,
    status,
    progressPercent: progress?.progress_percent ?? 0,
    currentSectionId: progress?.current_section_id ?? null,
    lastAccessedAt: progress?.last_accessed_at ?? null,
    completedAt: progress?.completed_at ?? null,
    href: `/learn/${moduleRow.slug}/${lesson.slug}`,
  };
}

function mapSection(
  section: Pick<
    LessonSectionRow,
    | "id"
    | "section_type"
    | "title"
    | "body_markdown"
    | "display_order"
    | "is_required"
  >,
  completedBySection: Map<string, string | null>,
) {
  if (!isLessonSectionType(section.section_type)) return null;
  const completedAt = completedBySection.get(section.id) ?? null;
  return {
    id: section.id,
    type: section.section_type,
    title: section.title,
    bodyMarkdown: section.body_markdown,
    displayOrder: section.display_order,
    isRequired: section.is_required,
    completed: Boolean(completedAt),
    completedAt,
  } satisfies LessonSection;
}

function normalizeSkill(value: string): LearningSkill {
  return isLearningSkill(value) ? value : "foundations";
}

function normalizeTestType(value: string): LearningTestType {
  return isLearningTestType(value) ? value : "both";
}

function normalizeDifficulty(value: string): LearningDifficulty {
  return isLearningDifficulty(value) ? value : "beginner";
}
