import { AlertTriangle, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import Link from "next/link";

import { WritingFeedbackRequest } from "@/components/writing/writing-feedback-request";
import { Button } from "@/components/ui/button";
import type { WritingSubmissionReviewData } from "@/server/writing/content";

const criterionLabels = {
  taskResponse: "Task Response",
  coherenceCohesion: "Coherence & Cohesion",
  lexicalResource: "Lexical Resource",
  grammaticalRangeAccuracy: "Grammatical Range & Accuracy",
} as const;

export function WritingReview({ data }: { data: WritingSubmissionReviewData }) {
  return (
    <div className="space-y-7">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="text-sm font-semibold text-[var(--success)]">
          Đã nộp · nội dung đã khóa
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty break-words">
          {data.task.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[var(--muted-foreground)]">
          <span>{data.submission.wordCount} từ</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 aria-hidden="true" size={16} />
            {new Intl.DateTimeFormat("vi-VN", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(data.submission.submittedAt))}
          </span>
          {data.submission.submittedAfterTimeLimit ? (
            <span className="text-[var(--warning)]">
              Nộp sau thời gian đề xuất
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <main className="min-w-0 space-y-6">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 className="text-xl font-bold">Bài đã nộp</h2>
            <p className="mt-4 leading-8 break-words whitespace-pre-wrap">
              {data.submission.text}
            </p>
          </section>
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 className="text-lg font-bold">Đề bài đã pin</h2>
            <p className="mt-3 leading-7">{data.task.promptText}</p>
          </section>
        </main>

        <aside className="min-w-0 space-y-5">
          {data.feedback ? (
            <FeedbackPanel feedback={data.feedback} />
          ) : (
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[var(--primary)]">
                <Sparkles aria-hidden="true" size={19} />
                <h2 className="text-lg font-bold">Góp ý AI tùy chọn</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                Đây là nhận xét luyện tập, không phải điểm IELTS chính thức. Bài
                đã nộp vẫn xem được kể cả khi AI chưa cấu hình hoặc gặp lỗi.
              </p>
              {data.feedbackRun?.status === "failed" ? (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-[var(--warning-subtle)] px-3 py-2 text-sm font-semibold">
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                    size={16}
                  />
                  Lần góp ý trước không tạo được kết quả hợp lệ. Không có nội
                  dung giả được lưu.
                </p>
              ) : null}
              {data.aiAvailable ? (
                <WritingFeedbackRequest
                  taskSlug={data.task.slug}
                  submissionId={data.submission.id}
                />
              ) : (
                <p className="mt-4 rounded-lg bg-[var(--muted)] px-3 py-2 text-sm font-semibold">
                  AI feedback chưa được cấu hình. Đây là fallback an toàn.
                </p>
              )}
            </section>
          )}
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/practice/writing/${data.task.slug}`}>
              Quay lại Writing task
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

function FeedbackPanel({
  feedback,
}: {
  feedback: WritingSubmissionReviewData["feedback"] & {};
}) {
  if (!feedback) return null;
  return (
    <section className="rounded-xl border border-[var(--primary-soft)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">
            Ước lượng luyện tập
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            Band {feedback.overallBandEstimate.toFixed(1)}
          </h2>
        </div>
        <span className="rounded-full bg-[var(--primary-subtle)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
          Độ tin cậy {feedback.confidence}
        </span>
      </div>
      <p className="mt-3 rounded-lg bg-[var(--warning-subtle)] px-3 py-2 text-sm font-semibold text-[var(--warning)]">
        Không phải điểm IELTS chính thức.
      </p>
      <p className="mt-4 leading-7">{feedback.summary}</p>

      <div className="mt-6 space-y-4">
        {Object.entries(feedback.criteria).map(([key, criterion]) => (
          <section key={key} className="border-t border-[var(--border)] pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">
                {criterionLabels[key as keyof typeof criterionLabels]}
              </h3>
              <span className="font-bold">{criterion.band.toFixed(1)}</span>
            </div>
            <p className="mt-2 text-sm leading-6">{criterion.comment}</p>
            <blockquote className="mt-2 border-l-2 border-[var(--primary-soft)] pl-3 text-sm text-[var(--muted-foreground)]">
              “{criterion.evidence[0]}”
            </blockquote>
          </section>
        ))}
      </div>

      <section className="mt-6 border-t border-[var(--border)] pt-4">
        <h3 className="font-bold">Ưu tiên sửa</h3>
        <ul className="mt-3 space-y-3">
          {feedback.priorityIssues.map((item) => (
            <li
              key={`${item.issue}-${item.evidence}`}
              className="text-sm leading-6"
            >
              <span className="inline-flex items-start gap-2 font-semibold">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-[var(--primary)]"
                  size={15}
                />
                {item.issue}
              </span>
              <p className="mt-1 pl-6 text-[var(--muted-foreground)]">
                “{item.evidence}”
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6 border-t border-[var(--border)] pt-4">
        <h3 className="font-bold">Kế hoạch revision</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
          {feedback.revisionPlan.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </section>
  );
}
