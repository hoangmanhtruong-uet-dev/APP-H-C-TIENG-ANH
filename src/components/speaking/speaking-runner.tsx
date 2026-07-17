"use client";

import { Mic, Square, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  createSpeakingUploadIntentAction,
  submitSpeakingAction,
  verifySpeakingUploadAction,
} from "@/features/speaking/actions";
import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SpeakingPracticeData } from "@/server/speaking/content";

type Recording = {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: "audio/webm" | "audio/mp4" | "audio/mpeg";
};

export function SpeakingRunner({
  data,
  mockContext,
}: {
  data: SpeakingPracticeData;
  mockContext?: MockRunnerContext;
}) {
  const router = useRouter();
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Record<string, Recording>>({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitKeyRef = useRef(crypto.randomUUID());
  const attempt = data.attempt;

  useEffect(
    () => () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  if (!attempt) return null;
  const attemptId = attempt.id;

  async function startRecording(promptId: string, maximumSeconds: number) {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMessage("Trình duyệt này chưa hỗ trợ ghi âm an toàn.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/mpeg",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!preferred) {
        stream.getTracks().forEach((track) => track.stop());
        setMessage("Không tìm thấy định dạng audio được hỗ trợ.");
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstart = (event) => {
        startedAtRef.current = event.timeStamp;
      };
      recorder.onstop = (event) => {
        const mimeType = preferred.startsWith("audio/webm")
          ? "audio/webm"
          : (preferred as Recording["mimeType"]);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Math.min(
          maximumSeconds,
          Math.max(0, (event.timeStamp - startedAtRef.current) / 1000),
        );
        const url = URL.createObjectURL(blob);
        setRecordings((current) => {
          const old = current[promptId];
          if (old) URL.revokeObjectURL(old.url);
          return { ...current, [promptId]: { blob, url, duration, mimeType } };
        });
        stream.getTracks().forEach((track) => track.stop());
        setActivePrompt(null);
        setMessage(
          "Bản ghi chỉ đang ở máy bạn. Hãy upload để server xác minh.",
        );
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      recorder.start(250);
      setActivePrompt(promptId);
      setMessage("Đang ghi âm…");
      stopTimerRef.current = setTimeout(stopRecording, maximumSeconds * 1000);
    } catch {
      setMessage(
        "Không thể truy cập microphone. Hãy kiểm tra quyền trình duyệt.",
      );
    }
  }

  function stopRecording() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function upload(promptId: string) {
    const recording = recordings[promptId];
    if (!recording) return;
    startTransition(async () => {
      setMessage("Đang cấp quyền upload private…");
      const result = await createSpeakingUploadIntentAction({
        attemptId,
        promptId,
        mimeType: recording.mimeType,
        sizeBytes: recording.blob.size,
        durationSeconds: recording.duration,
        idempotencyKey: crypto.randomUUID(),
      });
      if (result.status !== "ready") {
        setMessage(result.message);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage
        .from(result.intent.bucketId)
        .upload(result.intent.storagePath, recording.blob, {
          contentType: recording.mimeType,
          upsert: false,
        });
      if (error) {
        setMessage(
          "Upload private thất bại. File local vẫn còn để bạn thử lại.",
        );
        return;
      }
      setMessage("Server đang xác minh file thật…");
      const verified = await verifySpeakingUploadAction({
        intentId: result.intent.intentId,
        setSlug: data.set.slug,
      });
      setMessage(verified.message);
      if (verified.status === "verified") router.refresh();
    });
  }

  const readyCount = data.prompts.filter(
    (prompt) => prompt.verifiedAudio,
  ).length;
  const requiredCount = data.prompts.filter((prompt) => prompt.required).length;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-bold text-[var(--primary)]">
          Speaking practice
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty">
          {data.set.title}
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          {readyCount}/{requiredCount} câu bắt buộc đã có audio được server xác
          minh.
        </p>
      </header>
      <p
        aria-live="polite"
        className="min-h-6 text-sm font-medium text-[var(--muted-foreground)]"
      >
        {message}
      </p>
      <ol className="space-y-5">
        {data.prompts.map((prompt, index) => {
          const local = recordings[prompt.id];
          const isRecording = activePrompt === prompt.id;
          return (
            <li
              key={prompt.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
                  {prompt.part.replace("_", " ")} · câu {index + 1}
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {prompt.minimumAnswerSeconds}–{prompt.maximumAnswerSeconds}{" "}
                  giây
                </span>
              </div>
              <h2 className="mt-4 text-lg leading-7 font-bold">
                {prompt.text}
              </h2>
              {prompt.instructions ? (
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {prompt.instructions}
                </p>
              ) : null}
              {prompt.verifiedAudio?.signedUrl ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-bold text-emerald-700">
                    Đã xác minh ·{" "}
                    {Math.round(prompt.verifiedAudio.durationSeconds)} giây
                  </p>
                  <audio
                    controls
                    preload="none"
                    src={prompt.verifiedAudio.signedUrl}
                    className="w-full"
                  >
                    Trình duyệt không hỗ trợ audio.
                  </audio>
                </div>
              ) : null}
              {local ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm">
                    Bản ghi local · {Math.round(local.duration)} giây
                  </p>
                  <audio controls src={local.url} className="w-full">
                    Trình duyệt không hỗ trợ audio.
                  </audio>
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 py-2 font-bold text-white focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none"
                  >
                    <Square aria-hidden="true" size={17} />
                    Dừng ghi
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(activePrompt) || pending}
                    onClick={() =>
                      startRecording(prompt.id, prompt.maximumAnswerSeconds)
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 py-2 font-bold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none disabled:opacity-50"
                  >
                    <Mic aria-hidden="true" size={17} />
                    {prompt.verifiedAudio ? "Ghi lại" : "Ghi âm"}
                  </button>
                )}
                {local ? (
                  <button
                    type="button"
                    disabled={pending || isRecording}
                    onClick={() => upload(prompt.id)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-bold text-white focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none disabled:opacity-50"
                  >
                    <UploadCloud aria-hidden="true" size={17} />
                    Upload và xác minh
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="sticky bottom-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
        <button
          type="button"
          disabled={
            pending || readyCount < requiredCount || Boolean(activePrompt)
          }
          onClick={() =>
            startTransition(async () => {
              const result = mockContext
                ? await submitMockTestSectionAction({
                    mockTestSlug: mockContext.mockTestSlug,
                    sessionId: mockContext.sessionId,
                    sectionAttemptId: mockContext.sectionAttemptId,
                    idempotencyKey: submitKeyRef.current,
                  })
                : await submitSpeakingAction({
                    attemptId,
                    setSlug: data.set.slug,
                    idempotencyKey: submitKeyRef.current,
                  });
              if (result?.status === "error") setMessage(result.message);
            })
          }
          className="min-h-11 w-full rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-white focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nộp attempt bất biến
        </button>
      </div>
    </div>
  );
}
