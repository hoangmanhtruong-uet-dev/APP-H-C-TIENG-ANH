import { CheckCircle2, Save } from "lucide-react";
import Link from "next/link";

import { LessonMarkdown } from "@/components/learning/lesson-markdown";
import { SubmitAttemptForm } from "@/components/practice/submit-attempt-form";
import { Button } from "@/components/ui/button";
import {
  savePracticeAnswerAction,
  startPracticeAction,
} from "@/features/practice/actions";
import { nextQuestionPosition } from "@/features/practice/model";
import type { PracticePageData } from "@/server/practice/content";

export function PracticeRunner({
  data,
  saved,
  error,
}: {
  data: PracticePageData;
  saved: boolean;
  error: string | undefined;
}) {
  if (!data.attempt) {
    return <PracticeStart data={data} error={error} />;
  }

  const { activeQuestion, questions, attempt, exercise } = data;
  const isLast = activeQuestion.position === questions.length;
  const selected = new Set(activeQuestion.answer?.selectedOptionIds ?? []);
  const revision = (activeQuestion.answer?.clientRevision ?? 0) + 1;
  const answeredCount = questions.filter((question) => question.answer).length;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">
            Câu {activeQuestion.position} / {questions.length}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-pretty">
            {exercise.title}
          </h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] tabular-nums">
          Đã lưu {answeredCount}/{questions.length} câu
        </p>
      </div>

      {saved ? (
        <p
          role="status"
          className="rounded-lg bg-[var(--success-subtle)] px-4 py-3 text-sm font-semibold"
        >
          Câu trả lời đã được lưu vào PostgreSQL.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-[var(--danger-subtle)] px-4 py-3 text-sm font-semibold"
        >
          Không thể lưu hoặc nộp bài. Dữ liệu hiện có vẫn được giữ; hãy thử lại.
        </p>
      ) : null}

      <nav aria-label="Điều hướng câu hỏi" className="overflow-x-auto pb-2">
        <ol className="flex min-w-max gap-2">
          {questions.map((question) => (
            <li key={question.id}>
              <Link
                href={`/practice/${exercise.slug}?question=${question.position}`}
                aria-current={
                  question.id === activeQuestion.id ? "step" : undefined
                }
                aria-label={`Câu ${question.position}${question.answer ? ", đã lưu" : ""}`}
                className={`flex size-11 items-center justify-center rounded-lg border text-sm font-bold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none ${
                  question.id === activeQuestion.id
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                }`}
              >
                {question.answer ? (
                  <CheckCircle2 aria-hidden="true" size={18} />
                ) : (
                  question.position
                )}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <form action={savePracticeAnswerAction} className="space-y-7">
        <input type="hidden" name="attemptId" value={attempt.id} />
        <input type="hidden" name="questionId" value={activeQuestion.id} />
        <input type="hidden" name="exerciseSlug" value={exercise.slug} />
        <input type="hidden" name="clientRevision" value={revision} />
        <input
          type="hidden"
          name="nextPosition"
          value={nextQuestionPosition(
            activeQuestion.position,
            questions.length,
          )}
        />

        <fieldset className="space-y-6">
          <legend className="w-full text-xl leading-8 font-bold text-pretty">
            <LessonMarkdown>{activeQuestion.promptMarkdown}</LessonMarkdown>
          </legend>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeQuestion.type === "multiple_choice"
              ? "Chọn tất cả đáp án đúng. Không có điểm từng phần."
              : activeQuestion.type === "short_text"
                ? "Nhập đáp án chính xác; hệ thống bỏ qua khác biệt chữ hoa và khoảng trắng thừa."
                : "Chọn một đáp án."}
          </p>

          {activeQuestion.type === "short_text" ? (
            <div>
              <label
                htmlFor="answerText"
                className="mb-2 block text-sm font-bold"
              >
                Câu trả lời
              </label>
              <input
                id="answerText"
                name="answerText"
                type="text"
                required
                maxLength={2000}
                defaultValue={activeQuestion.answer?.text ?? ""}
                autoComplete="off"
                className="min-h-12 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-base focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {activeQuestion.options.map((option) => (
                <label
                  key={option.id}
                  className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:border-[var(--border-strong)]"
                >
                  <input
                    type={
                      activeQuestion.type === "multiple_choice"
                        ? "checkbox"
                        : "radio"
                    }
                    name="selectedOptionIds"
                    value={option.id}
                    required={activeQuestion.type !== "multiple_choice"}
                    defaultChecked={selected.has(option.id)}
                    className="mt-1 size-4 accent-[var(--primary)]"
                  />
                  <span className="leading-6">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" variant="secondary" className="min-h-11">
            <Save aria-hidden="true" size={17} />
            {isLast ? "Lưu câu cuối" : "Lưu và sang câu tiếp"}
          </Button>
          <p className="text-sm text-[var(--muted-foreground)]">
            Có thể refresh hoặc quay lại sau khi đã lưu.
          </p>
        </div>
      </form>

      <SubmitAttemptForm attemptId={attempt.id} exerciseSlug={exercise.slug} />
    </div>
  );
}

function PracticeStart({
  data,
  error,
}: {
  data: PracticePageData;
  error?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <p className="text-sm font-semibold text-[var(--primary)]">
          {data.exercise.domain === "vocabulary" ? "Vocabulary" : "Grammar"}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty">
          {data.exercise.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          {data.exercise.summary}
        </p>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <LessonMarkdown>{data.exercise.instructionsMarkdown}</LessonMarkdown>
        <p className="mt-4 text-sm font-semibold">
          {data.questions.length} câu · chấm điểm deterministic
        </p>
      </div>
      {error ? (
        <p role="alert">Không thể bắt đầu bài tập. Hãy thử lại.</p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={startPracticeAction}>
          <input type="hidden" name="exerciseSlug" value={data.exercise.slug} />
          <Button type="submit" className="min-h-11">
            Bắt đầu bài tập
          </Button>
        </form>
        {data.latestResult ? (
          <Button asChild variant="secondary" className="min-h-11">
            <Link
              href={`/practice/${data.exercise.slug}/result/${data.latestResult.id}`}
            >
              Xem kết quả gần nhất
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
