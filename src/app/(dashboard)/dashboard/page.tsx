import {
  ArrowRight,
  CalendarClock,
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
  const { account, learnerProfile } = await requireCompletedOnboarding();
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
        description={`Thiết lập ${testType} của bạn đã sẵn sàng. Các phase sau sẽ dùng chính dữ liệu này để xây dựng lộ trình.`}
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
            title="Học hôm nay"
            description="Nhiệm vụ học sẽ xuất hiện khi module tạo lộ trình được triển khai ở phase tiếp theo."
          />
          <EmptyState
            className="mt-6 border-0 bg-[var(--background)] py-8"
            title="Chưa có nhiệm vụ học"
            description="Onboarding chỉ lưu mục tiêu và sở thích thật; hệ thống không tạo task mẫu để giả một kế hoạch đang hoạt động."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/roadmap">
                  Xem lộ trình
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
                </Link>
              </Button>
            }
          />
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
