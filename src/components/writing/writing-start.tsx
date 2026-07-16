import { Clock3, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { startWritingAction } from "@/features/writing/actions";
import type { WritingPracticePageData } from "@/server/writing/content";

export function WritingStart({
  data,
  error,
}: {
  data: WritingPracticePageData;
  error?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">
          Writing Task 2 · Academic
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty break-words">
          {data.task.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          {data.task.description}
        </p>
      </header>
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="text-lg font-bold">Đề bài</h2>
        <p className="mt-3 leading-7 whitespace-pre-wrap">
          {data.task.promptText}
        </p>
        <p className="mt-5 text-sm leading-6 text-[var(--muted-foreground)]">
          {data.task.instructions}
        </p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
          <span className="inline-flex items-center gap-2">
            <Clock3 aria-hidden="true" size={17} />
            {Math.round(data.task.timeLimitSeconds / 60)} phút
          </span>
          <span>Tối thiểu {data.task.minimumWords} từ</span>
        </div>
      </section>
      <p className="flex items-start gap-2 rounded-lg bg-[var(--primary-subtle)] px-4 py-3 text-sm leading-6">
        <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
        Bản nháp, thời gian và bài nộp được lưu trong PostgreSQL. Sau khi nộp,
        bài viết trở thành bất biến.
      </p>
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-[var(--destructive-subtle)] px-4 py-3 font-semibold"
        >
          Không thể bắt đầu Writing task. Hãy thử lại.
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={startWritingAction}>
          <input type="hidden" name="taskSlug" value={data.task.slug} />
          <Button type="submit" className="w-full sm:w-auto">
            Bắt đầu viết
          </Button>
        </form>
        {data.latestSubmissionId ? (
          <Button asChild variant="secondary">
            <Link
              href={`/practice/writing/${data.task.slug}/submission/${data.latestSubmissionId}`}
            >
              Xem bài đã nộp gần nhất
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
