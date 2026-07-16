import { ArrowRight, CheckCircle2, Circle, Clock3 } from "lucide-react";
import Link from "next/link";

import { LearningProgress } from "@/components/learning/learning-progress";
import type { LearningModuleSummary } from "@/server/learning/content";

export function ModuleLessons({ module }: { module: LearningModuleSummary }) {
  if (module.lessons.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-[var(--muted-foreground)]">
        Module này chưa có bài học đã xuất bản.
      </p>
    );
  }

  return (
    <ol className="space-y-3" aria-label={`Bài học trong ${module.title}`}>
      {module.lessons.map((lesson, index) => {
        const completed = lesson.status === "completed";
        const inProgress = lesson.status === "in_progress";
        const actionLabel = completed
          ? "Xem lại bài học"
          : inProgress
            ? "Tiếp tục học"
            : "Bắt đầu bài học";

        return (
          <li
            key={lesson.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
          >
            <div className="flex gap-4">
              <div className="mt-1 text-[var(--primary)]">
                {completed ? (
                  <CheckCircle2 aria-hidden="true" size={22} />
                ) : (
                  <Circle aria-hidden="true" size={22} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  Bài {index + 1}
                </p>
                <h2 className="mt-1 text-xl font-bold text-pretty">
                  {lesson.title}
                </h2>
                <p className="mt-2 max-w-2xl leading-7 text-pretty text-[var(--muted-foreground)]">
                  {lesson.summary}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--muted-foreground)]">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 aria-hidden="true" size={17} />
                    {lesson.estimatedMinutes} phút
                  </span>
                  <span>
                    {completed
                      ? "Đã hoàn thành"
                      : inProgress
                        ? "Đang học"
                        : "Chưa bắt đầu"}
                  </span>
                </div>
                {inProgress ? (
                  <LearningProgress
                    className="mt-4 max-w-lg"
                    value={lesson.progressPercent}
                    label={`Tiến độ ${lesson.title}`}
                  />
                ) : null}
              </div>
              <Link
                href={lesson.href}
                aria-label={`${actionLabel}: ${lesson.title}`}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                <ArrowRight aria-hidden="true" size={19} />
              </Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
