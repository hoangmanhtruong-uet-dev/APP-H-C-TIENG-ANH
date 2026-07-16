import { BookOpenCheck, CheckCircle2, Clock3, PlayCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LearningProgress } from "@/components/learning/learning-progress";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  buildLearningOverview,
  getLearningCatalog,
} from "@/server/learning/content";
import { getRecentAttemptHistory } from "@/server/practice/content";

export const metadata: Metadata = {
  title: "Tiến độ học tập",
  description: "Tiến độ được tính từ bài học và phần học đã hoàn thành.",
};

const activityDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export default async function ProgressPage() {
  const [modules, attempts] = await Promise.all([
    getLearningCatalog(),
    getRecentAttemptHistory(),
  ]);
  const overview = buildLearningOverview(modules);

  return (
    <div className="space-y-9">
      <PageHeader
        title="Tiến độ học tập"
        description="Số liệu dưới đây được tính từ section và lesson progress đã lưu trong PostgreSQL."
      />

      <section
        aria-label="Tổng quan tiến độ"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <ProgressMetric
          icon={<BookOpenCheck aria-hidden="true" size={21} />}
          label="Bài có thể học"
          value={overview.totalLessons}
        />
        <ProgressMetric
          icon={<CheckCircle2 aria-hidden="true" size={21} />}
          label="Đã hoàn thành"
          value={overview.completedLessons}
        />
        <ProgressMetric
          icon={<PlayCircle aria-hidden="true" size={21} />}
          label="Đang học"
          value={overview.inProgressLessons}
        />
        <ProgressMetric
          icon={<Clock3 aria-hidden="true" size={21} />}
          label="Tiến độ tổng"
          value={`${Math.round(overview.progressPercent)}%`}
        />
      </section>

      {modules.length > 0 ? (
        <section aria-labelledby="module-progress-title">
          <h2 id="module-progress-title" className="text-2xl font-bold">
            Tiến độ theo module
          </h2>
          <div className="mt-5 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 sm:px-7">
            {modules.map((module) => (
              <article key={module.id} className="py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-pretty">
                      <Link
                        href={`/learn/${module.slug}`}
                        className="rounded-sm hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                      >
                        {module.title}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {module.completedLessons}/{module.totalLessons} bài đã
                      hoàn thành
                    </p>
                  </div>
                  <LearningProgress
                    className="w-full sm:max-w-sm"
                    value={module.progressPercent}
                    label={`Tiến độ ${module.title}`}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="Chưa có dữ liệu tiến độ"
          description="Chưa có module đã xuất bản phù hợp. Hệ thống không tạo số liệu minh họa giả."
        />
      )}

      <section aria-labelledby="attempt-history-title">
        <h2 id="attempt-history-title" className="text-2xl font-bold">
          Lịch sử luyện tập
        </h2>
        {attempts.length > 0 ? (
          <ol className="mt-5 space-y-3">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    href={`/practice/${attempt.exerciseSlug}/result/${attempt.id}`}
                    className="font-bold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    {attempt.title}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {attempt.domain === "vocabulary" ? "Vocabulary" : "Grammar"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold tabular-nums">
                    {attempt.score}/{attempt.maxScore}
                  </p>
                  <time
                    dateTime={attempt.submittedAt}
                    className="text-sm text-[var(--muted-foreground)]"
                  >
                    {activityDateFormatter.format(
                      new Date(attempt.submittedAt),
                    )}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-[var(--muted-foreground)]">
            Kết quả Vocabulary và Grammar sẽ xuất hiện sau lần nộp bài đầu tiên.
          </p>
        )}
      </section>

      <section aria-labelledby="recent-learning-title">
        <h2 id="recent-learning-title" className="text-2xl font-bold">
          Hoạt động gần đây
        </h2>
        {overview.recentLessons.length > 0 ? (
          <ol className="mt-5 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 sm:px-7">
            {overview.recentLessons.map((lesson) => (
              <li
                key={lesson.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={lesson.href}
                    className="font-bold text-pretty hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    {lesson.title}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {lesson.moduleTitle} · {Math.round(lesson.progressPercent)}%
                  </p>
                </div>
                <time
                  dateTime={lesson.lastAccessedAt ?? undefined}
                  className="shrink-0 text-sm text-[var(--muted-foreground)]"
                >
                  {lesson.lastAccessedAt
                    ? activityDateFormatter.format(
                        new Date(lesson.lastAccessedAt),
                      )
                    : "Chưa mở"}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-[var(--muted-foreground)]">
            Mở một bài học để bắt đầu lưu lịch sử học gần đây.
          </p>
        )}
      </section>
    </div>
  );
}

function ProgressMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-[var(--primary)]">{icon}</div>
      <p className="mt-5 text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </article>
  );
}
