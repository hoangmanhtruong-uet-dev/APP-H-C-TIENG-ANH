"use client";

import { AlertTriangle, Check, Clock3, RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import {
  saveWritingDraftAction,
  submitWritingAction,
} from "@/features/writing/actions";
import { formatWritingTime } from "@/features/writing/model";
import type { WritingPracticePageData } from "@/server/writing/content";

type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error";

export function WritingRunner({
  data,
  mockContext,
}: {
  data: WritingPracticePageData;
  mockContext?: MockRunnerContext;
}) {
  const submission = data.submission;
  if (!submission) return null;
  return (
    <WritingEditor
      data={data}
      submission={submission}
      mockContext={mockContext}
    />
  );
}

function WritingEditor({
  data,
  submission,
  mockContext,
}: {
  data: WritingPracticePageData;
  submission: NonNullable<WritingPracticePageData["submission"]>;
  mockContext?: MockRunnerContext;
}) {
  const [draftText, setDraftText] = useState(submission.draftText);
  const [serverWordCount, setServerWordCount] = useState(submission.wordCount);
  const [minimumWordsMet, setMinimumWordsMet] = useState(
    submission.minimumWordsMet,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState(
    "Bản nháp đang đồng bộ với PostgreSQL.",
  );
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calculateRemaining(submission.serverNow, submission.expiresAt),
  );
  const [isSubmitting, startSubmitTransition] = useTransition();
  const revisionRef = useRef(submission.serverRevision);
  const lastSavedTextRef = useRef(submission.draftText);
  const saveInFlightRef = useRef(false);
  const submitKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    const serverOffset = new Date(submission.serverNow).getTime() - Date.now();
    const expiresAt = new Date(submission.expiresAt).getTime();
    const update = () =>
      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil((expiresAt - (Date.now() + serverOffset)) / 1_000),
        ),
      );
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [submission.expiresAt, submission.serverNow]);

  const save = useCallback(async () => {
    if (
      saveInFlightRef.current ||
      draftText === lastSavedTextRef.current ||
      saveStatus === "conflict"
    ) {
      return saveStatus !== "conflict";
    }
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    setMessage("Đang lưu vào PostgreSQL…");
    const result = await saveWritingDraftAction({
      submissionId: submission.id,
      taskSlug: data.task.slug,
      draftText,
      expectedRevision: revisionRef.current,
    });
    saveInFlightRef.current = false;
    if (result.status === "saved") {
      revisionRef.current = result.serverRevision;
      lastSavedTextRef.current = draftText;
      setServerWordCount(result.wordCount);
      setMinimumWordsMet(result.minimumWordsMet);
      setSaveStatus("saved");
      setMessage("Đã lưu vào PostgreSQL.");
      return true;
    }
    setSaveStatus(result.status);
    setMessage(result.message);
    return false;
  }, [data.task.slug, draftText, saveStatus, submission.id]);

  useEffect(() => {
    if (draftText === lastSavedTextRef.current || saveStatus === "conflict")
      return;
    const timer = window.setTimeout(() => void save(), 800);
    return () => window.clearTimeout(timer);
  }, [draftText, save, saveStatus]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (draftText === lastSavedTextRef.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draftText]);

  async function submit() {
    const saved = await save();
    if (!saved || saveStatus === "conflict") return;
    startSubmitTransition(async () => {
      const result = mockContext
        ? await submitMockTestSectionAction({
            mockTestSlug: mockContext.mockTestSlug,
            sessionId: mockContext.sessionId,
            sectionAttemptId: mockContext.sectionAttemptId,
            idempotencyKey: submitKeyRef.current,
          })
        : await submitWritingAction({
            submissionId: submission.id,
            taskSlug: data.task.slug,
          });
      if (result?.status === "error") {
        setSaveStatus("error");
        setMessage(result.message);
      }
    });
  }

  const localWordCount = countWords(draftText);
  const isExpired = remainingSeconds === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--primary)]">
            Writing Task 2
          </p>
          <h1 className="mt-1 text-2xl font-bold text-pretty break-words sm:text-3xl">
            {data.task.title}
          </h1>
        </div>
        <span
          aria-label={`${remainingSeconds} giây còn lại theo máy chủ`}
          className={`inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 font-mono text-sm font-bold ${isExpired ? "bg-[var(--warning-subtle)] text-[var(--warning)]" : "bg-[var(--primary-subtle)] text-[var(--primary)]"}`}
        >
          <Clock3 aria-hidden="true" size={17} />
          {formatWritingTime(remainingSeconds)}
        </span>
      </header>

      {isExpired ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-[var(--warning-subtle)] px-4 py-3 text-sm font-semibold"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={18}
          />
          Đã hết thời gian đề xuất. Bạn vẫn có thể lưu và nộp; PostgreSQL sẽ ghi
          nhận trạng thái nộp muộn.
        </p>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(18rem,.72fr)_minmax(0,1.28fr)]">
        <aside className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:p-6">
          <h2 className="text-lg font-bold">Đề bài</h2>
          <p className="mt-3 leading-7 break-words whitespace-pre-wrap">
            {data.task.promptText}
          </p>
          <p className="mt-5 text-sm leading-6 text-[var(--muted-foreground)]">
            {data.task.instructions}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <dt className="text-[var(--muted-foreground)]">Mục tiêu</dt>
              <dd className="mt-1 font-bold">{data.task.wordTarget} từ</dd>
            </div>
            <div className="rounded-lg bg-[var(--muted)] p-3">
              <dt className="text-[var(--muted-foreground)]">Tối thiểu</dt>
              <dd className="mt-1 font-bold">{data.task.minimumWords} từ</dd>
            </div>
          </dl>
        </aside>

        <section
          aria-label="Trình soạn bài Writing"
          className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <label htmlFor="writing-draft" className="text-lg font-bold">
                Bài viết của bạn
              </label>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {localWordCount} từ đang gõ · {serverWordCount} từ đã xác nhận
                bởi PostgreSQL
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void save()}
              disabled={saveStatus === "saving" || saveStatus === "conflict"}
            >
              <Save aria-hidden="true" size={15} /> Lưu ngay
            </Button>
          </div>
          <textarea
            id="writing-draft"
            name="writingDraft"
            value={draftText}
            onChange={(event) => {
              setDraftText(event.target.value);
              if (saveStatus !== "conflict") setSaveStatus("idle");
            }}
            maxLength={20_000}
            autoComplete="off"
            spellCheck
            className="mt-4 min-h-[28rem] w-full resize-y rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-4 text-base leading-7 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            aria-describedby="writing-save-status writing-word-guidance"
          />
          <p
            id="writing-save-status"
            role={
              saveStatus === "error" || saveStatus === "conflict"
                ? "alert"
                : "status"
            }
            className="mt-3 flex min-h-6 items-start gap-2 text-sm font-semibold"
          >
            {saveStatus === "saved" ? (
              <Check aria-hidden="true" size={16} />
            ) : null}
            {saveStatus === "saving" ? (
              <Save aria-hidden="true" size={16} />
            ) : null}
            {message}
          </p>
          {saveStatus === "conflict" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              <RotateCcw aria-hidden="true" size={15} /> Tải bản PostgreSQL
            </Button>
          ) : null}
          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <p
              id="writing-word-guidance"
              className="text-sm leading-6 text-[var(--muted-foreground)]"
            >
              {minimumWordsMet
                ? "Bản đã lưu đạt số từ tối thiểu."
                : `Mục tiêu tối thiểu là ${data.task.minimumWords} từ; PostgreSQL sẽ tính lại khi lưu và nộp.`}
            </p>
            <Button
              type="button"
              className="mt-4 w-full"
              disabled={
                isSubmitting ||
                saveStatus === "saving" ||
                saveStatus === "conflict" ||
                draftText.trim().length === 0
              }
              onClick={() => void submit()}
            >
              {isSubmitting ? "Đang nộp…" : "Nộp bài và khóa nội dung"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function calculateRemaining(serverNow: string, expiresAt: string) {
  return Math.max(
    0,
    Math.ceil(
      (new Date(expiresAt).getTime() - new Date(serverNow).getTime()) / 1_000,
    ),
  );
}
