import { Clock3, Headphones } from "lucide-react";
import Link from "next/link";

import { LessonMarkdown } from "@/components/learning/lesson-markdown";
import { Button } from "@/components/ui/button";
import { startListeningPracticeAction } from "@/features/listening/actions";
import type { ListeningPracticePageData } from "@/server/listening/content";

export function ListeningStart({
  data,
  error,
}: {
  data: ListeningPracticePageData;
  error?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">
          Listening practice
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty break-words">
          {data.exercise.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          {data.exercise.summary}
        </p>
      </header>
      <section
        aria-labelledby="listening-instructions-title"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
      >
        <Headphones aria-hidden="true" className="text-[var(--primary)]" />
        <h2
          id="listening-instructions-title"
          className="mt-3 text-xl font-bold"
        >
          Hướng dẫn
        </h2>
        <div className="mt-3">
          <LessonMarkdown>{data.exercise.instructionsMarkdown}</LessonMarkdown>
        </div>
        <p className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Clock3 aria-hidden="true" size={17} />
          {Math.round(data.exercise.timeLimitSeconds / 60)} phút ·{" "}
          {data.questions.length} câu · {data.parts.length} phần
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Bạn có thể tua audio trong chế độ luyện tập. Đồng hồ lấy mốc từ
          PostgreSQL; hết giờ không tự sửa đáp án và trạng thái nộp muộn được
          lưu trong kết quả.
        </p>
      </section>
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-[var(--danger-subtle)] px-4 py-3 font-semibold"
        >
          Không thể bắt đầu bài Listening. Hãy thử lại.
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={startListeningPracticeAction}>
          <input type="hidden" name="exerciseSlug" value={data.exercise.slug} />
          <Button type="submit" className="min-h-11 w-full sm:w-auto">
            Bắt đầu làm bài
          </Button>
        </form>
        {data.latestResultId ? (
          <Button asChild variant="secondary" className="min-h-11">
            <Link
              href={`/practice/listening/${data.exercise.slug}/result/${data.latestResultId}`}
            >
              Xem kết quả gần nhất
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
