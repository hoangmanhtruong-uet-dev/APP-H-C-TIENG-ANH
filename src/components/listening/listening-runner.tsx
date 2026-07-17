"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, Clock3, Headphones, Save } from "lucide-react";

import { LessonMarkdown } from "@/components/learning/lesson-markdown";
import { Button } from "@/components/ui/button";
import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import {
  saveListeningAnswerAction,
  submitListeningPracticeAction,
} from "@/features/listening/actions";
import {
  formatListeningQuestionType,
  formatListeningTime,
} from "@/features/listening/model";
import type {
  ListeningPracticePageData,
  ListeningQuestion,
} from "@/server/listening/content";

type Draft = { answerText: string; selectedOptionIds: string[] };
type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "conflict" | "error";

export function ListeningRunner({
  data,
  mockContext,
}: {
  data: ListeningPracticePageData;
  mockContext?: MockRunnerContext;
}) {
  if (!data.attempt) return null;
  return <ActiveListeningRunner data={data} mockContext={mockContext} />;
}

function ActiveListeningRunner({
  data,
  mockContext,
}: {
  data: ListeningPracticePageData;
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [audioError, setAudioError] = useState(false);
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
  const persistRef = useRef<(question: ListeningQuestion) => Promise<boolean>>(
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
    (question: ListeningQuestion): Promise<boolean> => {
      const existing = inFlightRef.current.get(question.id);
      if (existing) return existing;
      const request = (async () => {
        const snapshot = draftsRef.current[question.id];
        if (!snapshot || !dirtyRef.current.has(question.id)) return true;
        setSaveStatus("saving");
        setMessage("");
        const result = await saveListeningAnswerAction({
          attemptId: attempt.id,
          questionId: question.id,
          exerciseSlug: data.exercise.slug,
          selectedOptionIds: snapshot.selectedOptionIds,
          answerText: snapshot.answerText,
          clientRevision: revisionsRef.current[question.id] + 1,
        });
        if (result.status === "saved") {
          revisionsRef.current[question.id] = result.clientRevision;
          if (
            JSON.stringify(draftsRef.current[question.id]) ===
            JSON.stringify(snapshot)
          ) {
            dirtyRef.current.delete(question.id);
          } else {
            timersRef.current.set(
              question.id,
              setTimeout(() => void persistRef.current(question), 100),
            );
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

  const updateDraft = (question: ListeningQuestion, next: Draft) => {
    draftsRef.current = { ...draftsRef.current, [question.id]: next };
    setDrafts(draftsRef.current);
    dirtyRef.current.add(question.id);
    setSaveStatus("dirty");
    setMessage("Có thay đổi chưa lưu.");
    const current = timersRef.current.get(question.id);
    if (current) clearTimeout(current);
    timersRef.current.set(
      question.id,
      setTimeout(() => void persist(question), 700),
    );
  };

  const submit = () =>
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
        : await submitListeningPracticeAction({
            attemptId: attempt.id,
            exerciseSlug: data.exercise.slug,
          });
      if (result?.status === "error") {
        setSaveStatus("error");
        setMessage(result.message);
      }
    });

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
            Listening practice
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
            aria-label={`Thời gian còn lại ${formatListeningTime(remainingSeconds)}`}
          >
            <Clock3 aria-hidden="true" size={17} />
            {formatListeningTime(remainingSeconds)}
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

      <section
        aria-labelledby="listening-audio-title"
        className="sticky top-3 z-10 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-4 shadow-sm sm:p-5"
      >
        <div className="flex items-center gap-2">
          <Headphones aria-hidden="true" size={19} />
          <h2 id="listening-audio-title" className="font-bold">
            Audio bài nghe
          </h2>
        </div>
        <audio
          aria-label={`Audio bài Listening ${data.exercise.title}`}
          className="mt-3 w-full"
          controls
          preload="metadata"
          onError={() => setAudioError(true)}
          onCanPlay={() => setAudioError(false)}
        >
          <source src={data.audio.path} type={data.audio.mimeType} />
          Trình duyệt của bạn không hỗ trợ audio HTML5.
        </audio>
        <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
          Nội dung nguyên bản · {data.audio.sourceName} · Cho phép tua trong
          practice
        </p>
        {audioError ? (
          <p
            role="alert"
            className="mt-2 text-sm font-semibold text-[var(--destructive)]"
          >
            Không tải được audio. Kiểm tra kết nối rồi tải lại trang; câu trả
            lời đã lưu vẫn được giữ.
          </p>
        ) : null}
      </section>

      <p
        role={
          saveStatus === "error" || saveStatus === "conflict"
            ? "alert"
            : "status"
        }
        aria-live="polite"
        className="flex min-h-6 items-center gap-2 text-sm font-semibold"
      >
        {saveStatus === "saving" ? <Save aria-hidden="true" size={16} /> : null}
        {saveStatus === "saved" ? <Check aria-hidden="true" size={16} /> : null}
        {message}
      </p>

      <nav aria-label="Điều hướng câu hỏi" className="overflow-x-auto pb-2">
        <ol className="flex min-w-max gap-2">
          {data.questions.map((question) => {
            const draft = drafts[question.id];
            const answered = Boolean(
              draft?.answerText.trim() || draft?.selectedOptionIds.length,
            );
            return (
              <li key={question.id}>
                <a
                  href={`#listening-question-${question.id}`}
                  aria-current={
                    activeQuestionId === question.id ? "step" : undefined
                  }
                  aria-label={`Câu ${question.position}, ${answered ? "đã trả lời" : "chưa trả lời"}`}
                  onClick={() => setActiveQuestionId(question.id)}
                  className={`flex size-11 items-center justify-center rounded-lg border font-bold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none ${activeQuestionId === question.id ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)] bg-[var(--surface)]"}`}
                >
                  {answered ? (
                    <>
                      <Check aria-hidden="true" size={18} />
                      <span className="sr-only">Câu {question.position}</span>
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

      <main
        aria-label="Câu hỏi Listening"
        className="mx-auto max-w-4xl space-y-9"
      >
        {data.parts.map((part) => {
          const questions = data.questions.filter(
            (question) => question.partId === part.id,
          );
          return (
            <section
              key={part.id}
              aria-labelledby={`listening-part-${part.id}`}
              className="space-y-5"
            >
              <div className="border-b border-[var(--border)] pb-4">
                <h2
                  id={`listening-part-${part.id}`}
                  className="text-xl font-bold text-pretty break-words"
                >
                  {part.title}
                </h2>
                <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  <LessonMarkdown>{part.instructionsMarkdown}</LessonMarkdown>
                </div>
              </div>
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  draft={
                    drafts[question.id] ?? {
                      answerText: "",
                      selectedOptionIds: [],
                    }
                  }
                  onFocus={() => setActiveQuestionId(question.id)}
                  onChange={(next) => updateDraft(question, next)}
                />
              ))}
            </section>
          );
        })}
        <section
          aria-labelledby="listening-submit-title"
          className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-5"
        >
          <h2 id="listening-submit-title" className="font-bold">
            Nộp bài
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Hệ thống lưu các thay đổi còn lại trước khi gọi submit atomic và
            idempotent. Review chỉ mở sau khi PostgreSQL chấm xong.
          </p>
          <Button
            type="button"
            className="mt-4 min-h-11 w-full"
            disabled={
              isSubmitting ||
              saveStatus === "saving" ||
              saveStatus === "conflict"
            }
            onClick={submit}
          >
            {isSubmitting ? "Đang nộp…" : "Nộp và xem kết quả"}
          </Button>
        </section>
      </main>
    </div>
  );
}

function QuestionCard({
  question,
  draft,
  onFocus,
  onChange,
}: {
  question: ListeningQuestion;
  draft: Draft;
  onFocus: () => void;
  onChange: (draft: Draft) => void;
}) {
  return (
    <fieldset
      id={`listening-question-${question.id}`}
      onFocus={onFocus}
      className="min-w-0 scroll-mt-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 focus-within:border-[var(--primary)] sm:p-6"
    >
      <legend className="px-1 text-sm font-bold">
        Câu {question.position} · {formatListeningQuestionType(question.type)}
      </legend>
      <div className="leading-7 font-semibold break-words">
        <LessonMarkdown>{question.promptMarkdown}</LessonMarkdown>
      </div>
      {question.type === "short_text" ? (
        <div className="mt-4">
          <label
            htmlFor={`listening-answer-${question.id}`}
            className="mb-2 block text-sm font-bold"
          >
            Câu trả lời
          </label>
          <input
            id={`listening-answer-${question.id}`}
            name={`listening-answer-${question.id}`}
            value={draft.answerText}
            onChange={(event) =>
              onChange({ ...draft, answerText: event.target.value })
            }
            maxLength={2000}
            autoComplete="off"
            placeholder="Nhập từ hoặc cụm từ…"
            className="min-h-12 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-base focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          />
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
                  name={`listening-question-${question.id}`}
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
