import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LearningProgress } from "@/components/learning/learning-progress";
import { ModuleLessons } from "@/components/learning/module-lessons";
import {
  LEARNING_DIFFICULTY_LABELS,
  LEARNING_SKILL_LABELS,
  LEARNING_TEST_TYPE_LABELS,
} from "@/features/learning/constants";
import { getLearningModule } from "@/server/learning/content";

export const metadata: Metadata = { title: "Module học tập" };

export default async function LearningModulePage({
  params,
}: {
  params: Promise<{ moduleSlug: string }>;
}) {
  const { moduleSlug } = await params;
  const learningModule = await getLearningModule(moduleSlug);
  if (!learningModule) notFound();

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <li>
            <Link
              href="/learn"
              className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              <ArrowLeft aria-hidden="true" size={17} /> Thư viện học
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li
            aria-current="page"
            className="font-medium text-[var(--foreground)]"
          >
            {learningModule.title}
          </li>
        </ol>
      </nav>

      <header className="border-b border-[var(--border)] pb-8">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-[var(--muted-foreground)]">
          <span>{LEARNING_SKILL_LABELS[learningModule.skill]}</span>
          <span>{LEARNING_TEST_TYPE_LABELS[learningModule.testType]}</span>
          <span>{LEARNING_DIFFICULTY_LABELS[learningModule.difficulty]}</span>
        </div>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-[-0.035em] text-pretty sm:text-4xl">
          {learningModule.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-pretty text-[var(--muted-foreground)]">
          {learningModule.description}
        </p>
        <LearningProgress
          className="mt-7 max-w-xl"
          value={learningModule.progressPercent}
          label={`Tiến độ ${learningModule.title}`}
        />
      </header>

      <section aria-labelledby="module-lessons-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="module-lessons-title" className="text-2xl font-bold">
              Bài học
            </h2>
            <p className="mt-1 text-[var(--muted-foreground)]">
              {learningModule.completedLessons}/{learningModule.totalLessons}{" "}
              bài đã hoàn thành
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--muted-foreground)] tabular-nums">
            Khoảng {learningModule.estimatedMinutes} phút
          </p>
        </div>
        <ModuleLessons module={learningModule} />
      </section>
    </div>
  );
}
