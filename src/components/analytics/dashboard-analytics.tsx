import {
  ArrowRight,
  ClipboardList,
  Headphones,
  Mic2,
  PenLine,
} from "lucide-react";
import Link from "next/link";

import { formatActivityStatus, SKILL_LABELS } from "@/features/analytics/model";
import type { LearnerAnalytics } from "@/server/analytics/content";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function DashboardAnalytics({
  analytics,
}: {
  analytics: LearnerAnalytics;
}) {
  const activeItems =
    analytics.overview.activePractice +
    analytics.overview.activeWriting +
    analytics.overview.activeSpeaking +
    analytics.overview.activeMockTests;

  return (
    <>
      <section aria-labelledby="active-work-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">
              Dữ liệu đã lưu
            </p>
            <h2 id="active-work-title" className="mt-1 text-2xl font-bold">
              Đang thực hiện
            </h2>
          </div>
          <Link
            href="/progress"
            className="inline-flex items-center gap-2 rounded-sm text-sm font-bold text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            Xem toàn bộ tiến độ <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActiveMetric
            icon={<Headphones size={20} />}
            label="Bài luyện tập"
            value={analytics.overview.activePractice}
          />
          <ActiveMetric
            icon={<PenLine size={20} />}
            label="Writing draft"
            value={analytics.overview.activeWriting}
          />
          <ActiveMetric
            icon={<Mic2 size={20} />}
            label="Speaking attempt"
            value={analytics.overview.activeSpeaking}
          />
          <ActiveMetric
            icon={<ClipboardList size={20} />}
            label="Mock Test"
            value={analytics.overview.activeMockTests}
          />
        </div>
        {activeItems === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] p-5 text-sm text-[var(--muted-foreground)]">
            Chưa có bài đang thực hiện. Hệ thống không tạo hoạt động minh họa
            giả.
          </p>
        ) : null}
      </section>

      <section
        className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"
        aria-label="Tóm tắt hoạt động học"
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-bold">Bằng chứng theo kỹ năng</h2>
          <ul className="mt-5 space-y-4">
            {analytics.skills.slice(0, 4).map((item) => (
              <li
                key={item.skill}
                className="flex items-center justify-between gap-4"
              >
                <span className="font-semibold">
                  {SKILL_LABELS[item.skill]}
                </span>
                <span className="text-sm text-[var(--muted-foreground)] tabular-nums">
                  {item.accuracyPercent !== null
                    ? `${item.accuracyPercent}% · ${item.scoredCount} bài đã chấm`
                    : `${item.activityCount} bài đã nộp`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-5 text-[var(--muted-foreground)]">
            Phần trăm chỉ được tính từ điểm thật của bài objective; không phải
            band IELTS.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-bold">Hoạt động gần đây</h2>
          {analytics.recentActivity.length > 0 ? (
            <ol className="mt-4 divide-y divide-[var(--border)]">
              {analytics.recentActivity.slice(0, 5).map((item) => (
                <li
                  key={`${item.activityType}-${item.entityId}`}
                  className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={item.href}
                      className="font-bold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {formatActivityStatus(item.status)}
                      {item.score !== null && item.maxScore !== null
                        ? ` · ${item.score}/${item.maxScore}`
                        : ""}
                    </p>
                  </div>
                  <time
                    dateTime={item.occurredAt}
                    className="shrink-0 text-sm text-[var(--muted-foreground)]"
                  >
                    {dateFormatter.format(new Date(item.occurredAt))}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] p-6 text-center text-[var(--muted-foreground)]">
              Hoạt động thật sẽ xuất hiện sau khi bạn mở hoặc nộp một bài.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function ActiveMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div aria-hidden="true" className="text-[var(--primary)]">
        {icon}
      </div>
      <p className="mt-4 text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </article>
  );
}
