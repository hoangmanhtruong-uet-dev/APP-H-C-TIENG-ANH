import { BookOpenCheck, CheckCircle2, Clock3, PlayCircle } from "lucide-react";
import Link from "next/link";

import {
  formatActivityStatus,
  formatFeedbackStatus,
  SKILL_LABELS,
} from "@/features/analytics/model";
import type { LearnerAnalytics } from "@/server/analytics/content";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function ProgressAnalytics({
  analytics,
}: {
  analytics: LearnerAnalytics;
}) {
  const { overview } = analytics;
  return (
    <>
      <section
        aria-label="Tổng quan tiến độ"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <ProgressMetric
          icon={<BookOpenCheck size={21} />}
          label="Bài có thể học"
          value={overview.lessonTotal}
        />
        <ProgressMetric
          icon={<CheckCircle2 size={21} />}
          label="Đã hoàn thành"
          value={overview.lessonCompleted}
        />
        <ProgressMetric
          icon={<PlayCircle size={21} />}
          label="Đang học"
          value={overview.lessonInProgress}
        />
        <ProgressMetric
          icon={<Clock3 size={21} />}
          label="Tiến độ lesson"
          value={`${Math.round(overview.lessonProgressPercent)}%`}
        />
      </section>

      <nav
        aria-label="Đi tới tiến độ theo kỹ năng"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {analytics.skills.map((item) => (
          <a
            key={item.skill}
            href={`#skill-${item.skill}`}
            className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold hover:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            {SKILL_LABELS[item.skill]}
          </a>
        ))}
        <a
          href="#mock-test-history"
          className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold hover:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Mock Tests
        </a>
      </nav>

      <section aria-labelledby="skill-progress-title">
        <h2 id="skill-progress-title" className="text-2xl font-bold">
          Tiến độ theo kỹ năng
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {analytics.skills.map((item) => (
            <article
              id={`skill-${item.skill}`}
              key={item.skill}
              className="scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold">
                  {SKILL_LABELS[item.skill]}
                </h3>
                <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                  {item.activityCount} hoạt động
                </span>
              </div>
              {item.accuracyPercent !== null ? (
                <>
                  <p className="mt-5 text-3xl font-bold tabular-nums">
                    {item.accuracyPercent}%
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {item.totalScore}/{item.totalMaxScore} điểm từ{" "}
                    {item.scoredCount} bài đã chấm
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-5 text-lg font-bold">
                    {formatFeedbackStatus(item.feedbackStatus)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Không tạo điểm hoặc band khi chưa có đánh giá thật.
                  </p>
                </>
              )}
              <p className="mt-5 text-sm text-[var(--muted-foreground)]">
                {item.latestActivityAt
                  ? `Gần nhất: ${dateFormatter.format(new Date(item.latestActivityAt))}`
                  : "Chưa có hoạt động đã hoàn thành."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="weak-areas-title"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7"
      >
        <h2 id="weak-areas-title" className="text-2xl font-bold">
          Khu vực cần ưu tiên
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Chỉ liệt kê kỹ năng objective dưới 70% khi có ít nhất 2 bài đã chấm;
          đây không phải dự đoán band.
        </p>
        {analytics.weakAreas.length > 0 ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {analytics.weakAreas.map((item) => (
              <li
                key={item.skill}
                className="rounded-xl bg-[var(--background)] p-4"
              >
                <p className="font-bold">{SKILL_LABELS[item.skill]}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)] tabular-nums">
                  {item.accuracyPercent}% từ {item.scoredCount} bài đã chấm
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-[var(--border-strong)] p-5 text-[var(--muted-foreground)]">
            Chưa đủ bài đã hoàn thành để xác định khu vực cần ưu tiên.
          </p>
        )}
      </section>

      <ActivityHistory analytics={analytics} />
      <MockHistory analytics={analytics} />
    </>
  );
}

function ActivityHistory({ analytics }: { analytics: LearnerAnalytics }) {
  return (
    <section aria-labelledby="recent-activity-title">
      <h2 id="recent-activity-title" className="text-2xl font-bold">
        Hoạt động gần đây
      </h2>
      {analytics.recentActivity.length > 0 ? (
        <ol className="mt-5 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 sm:px-7">
          {analytics.recentActivity.map((item) => (
            <li
              key={`${item.activityType}-${item.entityId}`}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={item.href}
                  className="font-bold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {formatActivityStatus(item.status)}
                  {item.score !== null && item.maxScore !== null
                    ? ` · ${item.score}/${item.maxScore}`
                    : ""}
                  {item.feedbackStatus
                    ? ` · ${formatFeedbackStatus(item.feedbackStatus)}`
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
        <p className="mt-5 rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-[var(--muted-foreground)]">
          Chưa có hoạt động thật để hiển thị.
        </p>
      )}
    </section>
  );
}

function MockHistory({ analytics }: { analytics: LearnerAnalytics }) {
  return (
    <section
      id="mock-test-history"
      aria-labelledby="mock-history-title"
      className="scroll-mt-24"
    >
      <h2 id="mock-history-title" className="text-2xl font-bold">
        Lịch sử Mock Test
      </h2>
      {analytics.mockTests.length > 0 ? (
        <ol className="mt-5 space-y-3">
          {analytics.mockTests.map((session) => (
            <li
              key={session.sessionId}
              className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={session.href}
                  className="font-bold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  {session.title}
                </Link>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {formatActivityStatus(session.status)} · bắt đầu{" "}
                  {dateFormatter.format(new Date(session.startedAt))}
                </p>
              </div>
              <div className="text-sm text-[var(--muted-foreground)] tabular-nums sm:text-right">
                <p>
                  Reading:{" "}
                  {scoreText(session.readingScore, session.readingMaxScore)}
                </p>
                <p>
                  Listening:{" "}
                  {scoreText(session.listeningScore, session.listeningMaxScore)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-[var(--muted-foreground)]">
          Mock Test đã bắt đầu sẽ xuất hiện tại đây; không có kết quả mẫu hoặc
          band giả.
        </p>
      )}
    </section>
  );
}

function scoreText(score: number | null, maxScore: number | null) {
  return score !== null && maxScore !== null
    ? `${score}/${maxScore}`
    : "Chưa có kết quả";
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
      <div aria-hidden="true" className="text-[var(--primary)]">
        {icon}
      </div>
      <p className="mt-5 text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </article>
  );
}
