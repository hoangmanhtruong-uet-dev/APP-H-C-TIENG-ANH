"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, Clock3, Save } from "lucide-react";

import { LessonMarkdown } from "@/components/learning/lesson-markdown";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import {
  saveReadingAnswerAction,
  submitReadingPracticeAction,
} from "@/features/reading/actions";
import {
  formatReadingQuestionType,
  formatRemainingTime,
} from "@/features/reading/model";
import type {
  ReadingPracticePageData,
  ReadingQuestion,
} from "@/server/reading/content";

type Draft = { answerText: string; selectedOptionIds: string[] };
type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "conflict" | "error";

export function ReadingRunner({
  data,
  mockContext,
}: {
  data: ReadingPracticePageData;
  mockContext?: MockRunnerContext;
}) {
  if (!data.attempt) return null;
  return <ActiveReadingRunner data={data} mockContext={mockContext} />;
}

function ActiveReadingRunner({
  data,
  mockContext,
}: {
  data: ReadingPracticePageData;
  mockContext?: MockRunnerContext;
}) {
  const attempt = data.attempt!;

  const initialDrafts = Object.fromEntries(
    data.questions.map((question) => [
      question.id,
      {
        answerText: question.answer?.text ?? "",
        selectedOptionIds: question.answer?.selectedOptionIds ?? [],
      },
    ]),
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>(initialDrafts);
  const [activeQuestionId, setActiveQuestionId] = useState(
    data.questions[0]?.id ?? "",
  );
  const [mobileView, setMobileView] = useState<"passage" | "questions">(
    "passage",
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(
      0,
      Math.ceil(
        (Date.parse(attempt.expiresAt) - Date.parse(attempt.serverNow)) / 1000,
      ),
    ),
  );
  const [isSubmitting, startSubmitting] = useTransition();
  const draftsRef = useRef(drafts);
  const revisionsRef = useRef<Record<string, number>>(
    Object.fromEntries(
      data.questions.map((question) => [
        question.id,
        question.answer?.clientRevision ?? 0,
      ]),
    ),
  );
  const dirtyRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlightRef = useRef(new Map<string, Promise<boolean>>());
  const persistRef = useRef<(question: ReadingQuestion) => Promise<boolean>>(
    async () => false,
  );
  const serverOffsetRef = useRef(0);
  const submitKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    serverOffsetRef.current = Date.parse(attempt.serverNow) - Date.now();
    const tick = () =>
      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil(
            (Date.parse(attempt.expiresAt) -
              (Date.now() + serverOffsetRef.current)) /
              1000,
          ),
        ),
      );
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [attempt.expiresAt, attempt.serverNow]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current.size > 0) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
    },
    [],
  );

  const persist = useCallback(
    (question: ReadingQuestion): Promise<boolean> => {
      const existing = inFlightRef.current.get(question.id);
      if (existing) return existing;
      const request = (async () => {
        const snapshot = draftsRef.current[question.id];
        if (!snapshot || !dirtyRef.current.has(question.id)) return true;
        setSaveStatus("saving");
        setMessage("");
        const result = await saveReadingAnswerAction({
          attemptId: attempt.id,
          questionId: question.id,
          exerciseSlug: data.exercise.slug,
          selectedOptionIds: snapshot.selectedOptionIds,
          answerText: snapshot.answerText,
          clientRevision: revisionsRef.current[question.id] + 1,
        });
        if (result.status === "saved") {
          revisionsRef.current[question.id] = result.clientRevision;
          const current = draftsRef.current[question.id];
          if (JSON.stringify(current) === JSON.stringify(snapshot)) {
            dirtyRef.current.delete(question.id);
          } else {
            const retryTimer = setTimeout(
              () => void persistRef.current(question),
              100,
            );
            timersRef.current.set(question.id, retryTimer);
          }
          setSaveStatus(dirtyRef.current.size > 0 ? "dirty" : "saved");
          setMessage("Đã lưu vào PostgreSQL.");
          return true;
        }
        setSaveStatus(result.status);
        setMessage(result.message);
        return false;
      })().finally(() => inFlightRef.current.delete(question.id));
      inFlightRef.current.set(question.id, request);
      return request;
    },
    [attempt.id, data.exercise.slug],
  );

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  const scheduleSave = useCallback(
    (question: ReadingQuestion) => {
      const current = timersRef.current.get(question.id);
      if (current) clearTimeout(current);
      timersRef.current.set(
        question.id,
        setTimeout(() => void persist(question), 700),
      );
    },
    [persist],
  );

  const updateDraft = (question: ReadingQuestion, next: Draft) => {
    draftsRef.current = { ...draftsRef.current, [question.id]: next };
    setDrafts(draftsRef.current);
    dirtyRef.current.add(question.id);
    setSaveStatus("dirty");
    setMessage("Có thay đổi chưa lưu.");
    scheduleSave(question);
  };

  const submit = () => {
    startSubmitting(async () => {
      setMessage("");
      const pending = data.questions.filter((question) =>
        dirtyRef.current.has(question.id),
      );
      const saved = await Promise.all(
        pending.map((question) => persist(question)),
      );
      if (saved.some((ok) => !ok) || dirtyRef.current.size > 0) {
        setSaveStatus("error");
        setMessage("Chưa thể nộp vì vẫn có câu chưa lưu hoặc đang xung đột.");
        return;
      }
      const result = mockContext
        ? await submitMockTestSectionAction({
            mockTestSlug: mockContext.mockTestSlug,
            sessionId: mockContext.sessionId,
            sectionAttemptId: mockContext.sectionAttemptId,
            idempotencyKey: submitKeyRef.current,
          })
        : await submitReadingPracticeAction({
            attemptId: attempt.id,
            exerciseSlug: data.exercise.slug,
          });
      if (result?.status === "error") {
        setSaveStatus("error");
        setMessage(result.message);
      }
    });
  };

  const answeredCount = data.questions.filter((question) => {
    const draft = drafts[question.id];
    return Boolean(draft?.answerText.trim() || draft?.selectedOptionIds.length);
  }).length;
  const isExpired = remainingSeconds === 0;

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex min-w-0 flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--primary)]">
            Reading practice
          </p>
          <h1 className="mt-1 text-2xl font-bold text-pretty break-words sm:text-3xl">
            {data.exercise.title}
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm font-semibold">
          <span>
            {answeredCount}/{data.questions.length} đã trả lời
          </span>
          <span
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 tabular-nums ${isExpired ? "border-[var(--destructive)]" : "border-[var(--border-strong)]"}`}
            aria-label={`Thời gian còn lại ${formatRemainingTime(remainingSeconds)}`}
          >
            <Clock3 aria-hidden="true" size={17} />{" "}
            {formatRemainingTime(remainingSeconds)}
          </span>
        </div>
      </header>

      {isExpired ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-[var(--danger-subtle)] px-4 py-3 text-sm font-semibold"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={18}
          />
          Đã hết thời gian đề xuất. Bạn vẫn có thể lưu và nộp; PostgreSQL sẽ ghi
          nhận nộp muộn.
        </p>
      ) : null}
      <p
        role={
          saveStatus === "error" || saveStatus === "conflict"
            ? "alert"
            : "status"
        }
        className="flex min-h-6 items-center gap-2 text-sm font-semibold"
      >
        {saveStatus === "saving" ? <Save aria-hidden="true" size={16} /> : null}
        {saveStatus === "saved" ? <Check aria-hidden="true" size={16} /> : null}
        {message}
      </p>

      <div
        className="grid grid-cols-2 gap-2 lg:hidden"
        role="group"
        aria-label="Chọn vùng nội dung"
      >
        <Button
          type="button"
          variant={mobileView === "passage" ? "primary" : "secondary"}
          onClick={() => setMobileView("passage")}
          aria-pressed={mobileView === "passage"}
        >
          Bài đọc
        </Button>
        <Button
          type="button"
          variant={mobileView === "questions" ? "primary" : "secondary"}
          onClick={() => setMobileView("questions")}
          aria-pressed={mobileView === "questions"}
        >
          Câu hỏi
        </Button>
      </div>

      <div className="min-w-0 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)] lg:gap-7">
        <article
          aria-labelledby="reading-passage-title"
          className={`${mobileView === "passage" ? "block" : "hidden"} min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:block lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:p-7`}
        >
          <h2
            id="reading-passage-title"
            className="text-2xl font-bold text-pretty break-words"
          >
            {data.passage.title}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Nội dung nguyên bản · {data.passage.sourceName}
          </p>
          <div className="mt-6 space-y-7">
            {data.passage.sections.map((section) => (
              <section
                key={section.id}
                aria-labelledby={
                  section.heading ? `section-${section.id}` : undefined
                }
              >
                {section.heading ? (
                  <h3
                    id={`section-${section.id}`}
                    className="mb-3 text-lg font-bold break-words"
                  >
                    {section.heading}
                  </h3>
                ) : null}
                <div className="leading-8 break-words">
                  <LessonMarkdown>{section.bodyMarkdown}</LessonMarkdown>
                </div>
              </section>
            ))}
          </div>
        </article>

        <main
          aria-label="Câu hỏi Reading"
          className={`${mobileView === "questions" ? "block" : "hidden"} min-w-0 space-y-6 lg:block lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-1`}
        >
          <nav aria-label="Điều hướng câu hỏi" className="overflow-x-auto pb-2">
            <ol className="flex min-w-max gap-2">
              {data.questions.map((question) => {
                const answered = Boolean(
                  drafts[question.id]?.answerText.trim() ||
                  drafts[question.id]?.selectedOptionIds.length,
                );
                return (
                  <li key={question.id}>
                    <a
                      href={`#reading-question-${question.id}`}
                      aria-current={
                        activeQuestionId === question.id ? "step" : undefined
                      }
                      aria-label={`Câu ${question.position}${answered ? ", đã trả lời" : ", chưa trả lời"}`}
                      onClick={() => setActiveQuestionId(question.id)}
                      className={`flex size-11 items-center justify-center rounded-lg border font-bold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none ${activeQuestionId === question.id ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)] bg-[var(--surface)]"}`}
                    >
                      {answered ? (
                        <>
                          <Check aria-hidden="true" size={18} />
                          <span className="sr-only">
                            Câu {question.position}
                          </span>
                        </>
                      ) : (
                        question.position
                      )}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>

          {data.groups.map((group) => {
            const questions = data.questions.filter(
              (question) => question.groupId === group.id,
            );
            return (
              <section
                key={group.id}
                aria-labelledby={`reading-group-${group.id}`}
                className="space-y-5"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">
                    {formatReadingQuestionType(group.type)}
                  </p>
                  <h2
                    id={`reading-group-${group.id}`}
                    className="mt-1 text-xl font-bold break-words"
                  >
                    {group.title}
                  </h2>
                  <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    <LessonMarkdown>
                      {group.instructionsMarkdown}
                    </LessonMarkdown>
                  </div>
                </div>
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    draft={drafts[question.id]}
                    maxAnswerWords={group.maxAnswerWords}
                    onFocus={() => setActiveQuestionId(question.id)}
                    onChange={(next) => updateDraft(question, next)}
                  />
                ))}
              </section>
            );
          })}

          <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-5">
            <h2 className="font-bold">Nộp bài</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Nộp bài là thao tác atomic và idempotent. Chỉ đáp án đã lưu mới
              được chấm.
            </p>
            <ConfirmSubmitButton
              className="mt-4 min-h-11 w-full"
              disabled={
                isSubmitting ||
                saveStatus === "saving" ||
                saveStatus === "conflict"
              }
              pending={isSubmitting}
              label="Nộp và xem kết quả"
              title="Nộp bài Reading?"
              description="Hệ thống sẽ lưu các thay đổi còn lại, khóa attempt và chấm theo đáp án PostgreSQL."
              onConfirm={submit}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  draft,
  maxAnswerWords,
  onFocus,
  onChange,
}: {
  question: ReadingQuestion;
  draft: Draft;
  maxAnswerWords: number | null;
  onFocus: () => void;
  onChange: (draft: Draft) => void;
}) {
  return (
    <fieldset
      id={`reading-question-${question.id}`}
      onFocus={onFocus}
      className="min-w-0 scroll-mt-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 focus-within:border-[var(--primary)]"
    >
      <legend className="px-1 text-sm font-bold">
        Câu {question.position}
      </legend>
      <div className="leading-7 font-semibold break-words">
        <LessonMarkdown>{question.promptMarkdown}</LessonMarkdown>
      </div>
      {question.type === "summary_completion" ? (
        <div className="mt-4">
          <label
            htmlFor={`reading-answer-${question.id}`}
            className="mb-2 block text-sm font-bold"
          >
            Câu trả lời
          </label>
          <input
            id={`reading-answer-${question.id}`}
            value={draft.answerText}
            onChange={(event) =>
              onChange({ ...draft, answerText: event.target.value })
            }
            maxLength={2000}
            autoComplete="off"
            className="min-h-12 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-base focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          />
          {maxAnswerWords ? (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Tối đa {maxAnswerWords} từ.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {question.options.map((option) => {
            const checked = draft.selectedOptionIds.includes(option.id);
            const multiple = question.type === "multiple_choice";
            return (
              <label
                key={option.id}
                className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-strong)] px-4 py-3 focus-within:ring-2 focus-within:ring-[var(--ring)] hover:border-[var(--primary)]"
              >
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={`reading-question-${question.id}`}
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...draft,
                      selectedOptionIds: multiple
                        ? checked
                          ? draft.selectedOptionIds.filter(
                              (id) => id !== option.id,
                            )
                          : [...draft.selectedOptionIds, option.id]
                        : [option.id],
                    })
                  }
                  className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="min-w-0 leading-6 break-words">
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
