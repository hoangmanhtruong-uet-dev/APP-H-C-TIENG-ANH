import { ArrowRight, BookOpenText, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";

import { LearningProgress } from "@/components/learning/learning-progress";
import { EmptyState } from "@/components/shared/empty-state";
import {
  LEARNING_DIFFICULTY_LABELS,
  LEARNING_SKILL_LABELS,
  LEARNING_TEST_TYPE_LABELS,
} from "@/features/learning/constants";
import type { LearningModuleSummary } from "@/server/learning/content";

export function ModuleCatalog({
  modules,
}: {
  modules: LearningModuleSummary[];
}) {
  if (modules.length === 0) {
    return (
      <EmptyState
        title="Chưa có nội dung đã xuất bản"
        description="Thư viện sẽ hiển thị khi có module phù hợp với loại IELTS của bạn. Không có nội dung mẫu giả được thay thế vào đây."
      />
    );
  }

  return (
    <div className="space-y-5" aria-label="Module học tập">
      {modules.map((module) => (
        <article
          key={module.id}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl min-w-0">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-[var(--muted-foreground)]">
                <span>{LEARNING_SKILL_LABELS[module.skill]}</span>
                <span>{LEARNING_TEST_TYPE_LABELS[module.testType]}</span>
                <span>{LEARNING_DIFFICULTY_LABELS[module.difficulty]}</span>
              </div>
              <h2 className="mt-3 text-2xl font-bold text-pretty text-[var(--foreground)]">
                <Link
                  href={`/learn/${module.slug}`}
                  className="rounded-sm hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  {module.title}
                </Link>
              </h2>
              <p className="mt-3 max-w-prose leading-7 text-pretty text-[var(--muted-foreground)]">
                {module.description}
              </p>
            </div>

            <dl className="grid shrink-0 grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:min-w-80">
              <div>
                <dt className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <BookOpenText aria-hidden="true" size={17} /> Bài học
                </dt>
                <dd className="mt-1 font-bold tabular-nums">
                  {module.totalLessons}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <CheckCircle2 aria-hidden="true" size={17} /> Hoàn thành
                </dt>
                <dd className="mt-1 font-bold tabular-nums">
                  {module.completedLessons}/{module.totalLessons}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <Clock3 aria-hidden="true" size={17} /> Thời lượng
                </dt>
                <dd className="mt-1 font-bold tabular-nums">
                  {module.estimatedMinutes} phút
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 grid gap-5 border-t border-[var(--border)] pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <LearningProgress
              value={module.progressPercent}
              label={`Tiến độ ${module.title}`}
            />
            <Link
              href={`/learn/${module.slug}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Mở module
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
