import { CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";

import { LessonMarkdown } from "@/components/learning/lesson-markdown";
import { Button } from "@/components/ui/button";
import { calculateScorePercent } from "@/features/practice/model";
import type { getReadingPracticeResult } from "@/server/reading/content";

type ResultData = NonNullable<
  Awaited<ReturnType<typeof getReadingPracticeResult>>
>;

export function ReadingResult({ data }: { data: ResultData }) {
  const { result, exercise, options } = data;
  const optionById = new Map(
    options.map((option) => [option.id, option.label]),
  );
  const percent = calculateScorePercent(result.score, result.maxScore);
  const elapsedSeconds = Math.max(
    0,
    Math.round(
      (Date.parse(result.submittedAt) - Date.parse(result.startedAt)) / 1000,
    ),
  );

  return (
    <div className="space-y-8">
      <header className="border-b border-[var(--border)] pb-7">
        <p className="text-sm font-semibold text-[var(--primary)]">
          Kết quả đã lưu
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty break-words">
          {exercise.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="text-4xl font-bold tabular-nums">
            {result.score}/{result.maxScore}
          </p>
          <p className="text-lg font-semibold text-[var(--muted-foreground)]">
            {percent}%
          </p>
        </div>
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Clock3 aria-hidden="true" size={17} />
          Thời gian: {Math.floor(elapsedSeconds / 60)} phút{" "}
          {elapsedSeconds % 60} giây
          {result.submittedAfterTimeLimit
            ? " · Nộp sau giới hạn"
            : " · Trong giới hạn"}
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Điểm và trạng thái thời gian do PostgreSQL tính từ snapshot đã xuất
          bản.
        </p>
      </header>

      <section aria-labelledby="reading-review-title">
        <h2 id="reading-review-title" className="text-2xl font-bold">
          Review từng câu
        </h2>
        <ol className="mt-5 space-y-5">
          {result.questions.map((question) => {
            const selected = question.selectedOptionIds
              .map((id) => optionById.get(id))
              .filter((label): label is string => Boolean(label));
            const correct = (question.correctOptionIds ?? [])
              .map((id) => optionById.get(id))
              .filter((label): label is string => Boolean(label));
            return (
              <li
                key={question.questionId}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
              >
                <div className="flex items-start gap-3">
                  {question.isCorrect ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-[var(--success)]"
                    />
                  ) : (
                    <XCircle
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-[var(--destructive)]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      Câu {question.position}:{" "}
                      {question.isCorrect ? "Đúng" : "Sai"} ·{" "}
                      {question.awardedPoints}/{question.points} điểm
                    </p>
                    <div className="mt-3 font-semibold break-words">
                      <LessonMarkdown>{question.promptMarkdown}</LessonMarkdown>
                    </div>
                    <dl className="mt-5 grid gap-4 text-sm">
                      <div>
                        <dt className="font-bold">Câu trả lời của bạn</dt>
                        <dd className="mt-1 leading-6 break-words text-[var(--muted-foreground)]">
                          {question.answerText ||
                            selected.join("; ") ||
                            "Không trả lời"}
                        </dd>
                      </div>
                      {result.reviewAllowed ? (
                        <>
                          <div>
                            <dt className="font-bold">Đáp án</dt>
                            <dd className="mt-1 leading-6 break-words text-[var(--muted-foreground)]">
                              {(question.acceptedTextAnswers ?? []).join(
                                "; ",
                              ) || correct.join("; ")}
                            </dd>
                          </div>
                          {question.explanationMarkdown ? (
                            <div>
                              <dt className="font-bold">Giải thích</dt>
                              <dd className="mt-2">
                                <LessonMarkdown>
                                  {question.explanationMarkdown}
                                </LessonMarkdown>
                              </dd>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </dl>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href={`/practice/reading/${exercise.slug}`}>
            <RotateCcw aria-hidden="true" size={17} /> Làm attempt mới
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/progress">Xem lịch sử học tập</Link>
        </Button>
      </div>
    </div>
  );
}
