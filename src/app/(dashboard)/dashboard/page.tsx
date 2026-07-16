import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  NotebookPen,
  Target,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import {
  GOAL_LABELS,
  isPrimaryGoal,
  isPrioritySkill,
  isTestType,
  SKILL_LABELS,
  TEST_TYPE_LABELS,
} from "@/features/onboarding/constants";
import { getAccountLabel } from "@/server/auth/account";
import { getLearningOverview } from "@/server/learning/content";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export const metadata: Metadata = {
  title: "Tổng quan",
  description: "Không gian tổng quan cho mục tiêu tự học IELTS.",
};

const examDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "long",
  timeZone: "UTC",
});

export default async function DashboardPage() {
  const [{ account, learnerProfile }, learningOverview] = await Promise.all([
    requireCompletedOnboarding(),
    getLearningOverview(),
  ]);
  const skills = learnerProfile.priority_skills.filter(isPrioritySkill);
  const testType = isTestType(learnerProfile.test_type)
    ? TEST_TYPE_LABELS[learnerProfile.test_type]
    : "IELTS";
  const goal = isPrimaryGoal(learnerProfile.primary_goal)
    ? GOAL_LABELS[learnerProfile.primary_goal]
    : "Chưa xác định";

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Xin chào, ${getAccountLabel(account)}`}
        description={`Thiết lập ${testType} của bạn đã sẵn sàng. Tiếp tục bài đang học hoặc mở bài tiếp theo trong thư viện.`}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/profile">Chỉnh mục tiêu</Link>
          </Button>
        }
      />

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Thiết lập học tập"
      >
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Target
            aria-hidden="true"
            size={22}
            className="text-[var(--primary)]"
          />
          <p className="mt-5 text-sm text-[var(--muted-foreground)]">
            Band mục tiêu
          </p>
          <p className="mt-1 text-2xl font-bold">
            {learnerProfile.target_band?.toFixed(1)}
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Clock3
            aria-hidden="true"
            size={22}
            className="text-[var(--primary)]"
          />
          <p className="mt-5 text-sm text-[var(--muted-foreground)]">
            Quỹ thời gian
          </p>
          <p className="mt-1 text-lg font-bold">
            {learnerProfile.daily_study_minutes} phút ·{" "}
            {learnerProfile.study_days_per_week} ngày/tuần
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <NotebookPen
            aria-hidden="true"
            size={22}
            className="text-[var(--primary)]"
          />
          <p className="mt-5 text-sm text-[var(--muted-foreground)]">Ưu tiên</p>
          <p className="mt-1 font-bold">
            {skills.map((skill) => SKILL_LABELS[skill]).join(", ")}
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <CalendarClock
            aria-hidden="true"
            size={22}
            className="text-[var(--primary)]"
          />
          <p className="mt-5 text-sm text-[var(--muted-foreground)]">
            Ngày thi dự kiến
          </p>
          <p className="mt-1 font-bold">
            {learnerProfile.target_exam_date
              ? examDateFormatter.format(
                  new Date(`${learnerProfile.target_exam_date}T00:00:00Z`),
                )
              : "Chưa xác định"}
          </p>
        </article>
      </section>

      <section
        className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]"
        aria-labelledby="today-title"
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7">
          <SectionHeader
            title={
              learningOverview.continueLesson
                ? "Tiếp tục bài đang học"
                : "Bài học tiếp theo"
            }
            description="Đề xuất này dùng thứ tự nội dung và tiến độ thật, không phải lộ trình hoặc gợi ý AI."
          />
          {learningOverview.nextLesson ? (
            <div className="mt-6 rounded-xl bg-[var(--background)] p-5 sm:p-6">
              <p className="text-sm font-semibold text-[var(--primary)]">
                {learningOverview.nextLesson.moduleTitle}
              </p>
              <h3 className="mt-2 text-xl font-bold text-pretty">
                {learningOverview.nextLesson.title}
              </h3>
              <p className="mt-2 max-w-xl leading-7 text-pretty text-[var(--muted-foreground)]">
                {learningOverview.nextLesson.summary}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Button asChild size="sm">
                  <Link href={learningOverview.nextLesson.href}>
                    {learningOverview.nextLesson.status === "in_progress"
                      ? "Tiếp tục học"
                      : "Bắt đầu bài học"}
                    <ArrowRight
                      aria-hidden="true"
                      size={17}
                      strokeWidth={1.8}
                    />
                  </Link>
                </Button>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {learningOverview.nextLesson.estimatedMinutes} phút
                  {learningOverview.nextLesson.status === "in_progress"
                    ? ` · ${Math.round(learningOverview.nextLesson.progressPercent)}% đã hoàn thành`
                    : ""}
                </span>
              </div>
            </div>
          ) : learningOverview.totalLessons > 0 ? (
            <div className="mt-6 rounded-xl bg-[var(--success-subtle)] p-6">
              <CheckCircle2
                aria-hidden="true"
                size={24}
                className="text-[var(--success)]"
              />
              <h3 className="mt-3 text-xl font-bold">
                Bạn đã hoàn thành toàn bộ bài học hiện có
              </h3>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Bạn có thể xem lại nội dung bất kỳ lúc nào trong thư viện.
              </p>
            </div>
          ) : (
            <EmptyState
              className="mt-6 border-0 bg-[var(--background)] py-8"
              title="Chưa có nội dung phù hợp"
              description="Thư viện chưa có module đã xuất bản cho thiết lập IELTS của bạn. Không có task mẫu hoặc tiến độ giả được tạo."
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link href="/learn">
                    Mở thư viện học
                    <ArrowRight
                      aria-hidden="true"
                      size={17}
                      strokeWidth={1.8}
                    />
                  </Link>
                </Button>
              }
            />
          )}

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
            <div>
              <dt className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <BookOpenCheck aria-hidden="true" size={17} /> Có thể học
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {learningOverview.totalLessons}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <CheckCircle2 aria-hidden="true" size={17} /> Hoàn thành
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {learningOverview.completedLessons}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--muted-foreground)]">
                Tiến độ tổng
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">
                {Math.round(learningOverview.progressPercent)}%
              </dd>
            </div>
          </dl>
        </div>

        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--foreground)] p-6 text-white sm:p-7">
          <p className="text-sm font-semibold text-[#aebfff]">Mục tiêu chính</p>
          <h2 className="mt-3 text-2xl font-bold">{goal}</h2>
          <p className="mt-4 text-sm leading-6 text-[#ccd5e8]">
            Band hiện tại:{" "}
            {learnerProfile.current_band?.toFixed(1) ?? "chưa xác định"}. Band
            mục tiêu: {learnerProfile.target_band?.toFixed(1)}.
          </p>
          <div className="mt-7 border-t border-white/15 pt-5 text-sm font-semibold text-[#e6ebf5]">
            Dữ liệu onboarding đã lưu
          </div>
        </aside>
      </section>
    </div>
  );
}
