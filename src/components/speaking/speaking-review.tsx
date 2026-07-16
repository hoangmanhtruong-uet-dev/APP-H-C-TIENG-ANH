"use client";

import { Bot, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";

import { requestSpeakingAiReviewAction } from "@/features/speaking/ai-actions";
import type { SpeakingReviewData } from "@/server/speaking/content";

export function SpeakingReview({ data }: { data: SpeakingReviewData }) {
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const feedback = data.feedback;
  const criteria =
    feedback?.criteria &&
    typeof feedback.criteria === "object" &&
    !Array.isArray(feedback.criteria)
      ? Object.entries(feedback.criteria).filter(
          (item): item is [string, string] => typeof item[1] === "string",
        )
      : [];
  const strengths = Array.isArray(feedback?.strengths)
    ? feedback.strengths.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const suggestions = Array.isArray(feedback?.suggestions)
    ? feedback.suggestions.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <p className="text-sm font-bold text-emerald-700">
          Attempt đã nộp · bất biến
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty">
          {data.set.title}
        </h1>
        <time
          dateTime={data.attempt.submittedAt}
          className="mt-2 block text-sm text-[var(--muted-foreground)]"
        >
          Nộp lúc{" "}
          {new Intl.DateTimeFormat("vi-VN", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(data.attempt.submittedAt))}
        </time>
      </header>
      <section aria-labelledby="responses-title">
        <h2 id="responses-title" className="text-2xl font-bold">
          Câu trả lời đã lưu
        </h2>
        <ol className="mt-4 space-y-4">
          {data.responses.map((response) => (
            <li
              key={response.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <p className="text-xs font-bold tracking-wide text-[var(--primary)] uppercase">
                {response.part.replace("_", " ")}
              </p>
              <h3 className="mt-2 leading-6 font-bold">{response.prompt}</h3>
              {response.signedUrl ? (
                <audio
                  controls
                  preload="none"
                  src={response.signedUrl}
                  className="mt-4 w-full"
                >
                  Trình duyệt không hỗ trợ audio.
                </audio>
              ) : (
                <p className="mt-3 text-sm text-red-700">
                  Audio private hiện không thể phát.
                </p>
              )}
              {response.transcript ? (
                <details className="mt-4">
                  <summary className="cursor-pointer font-bold">
                    Transcript từ nhà cung cấp
                  </summary>
                  <p className="mt-3 rounded-xl bg-[var(--surface-subtle)] p-4 text-sm leading-6 whitespace-pre-wrap">
                    {response.transcript}
                  </p>
                </details>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                  Chưa có transcript thật · trạng thái:{" "}
                  {response.transcriptStatus}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
      {feedback ? (
        <section
          aria-labelledby="feedback-title"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <div className="flex items-center gap-3">
            <Bot aria-hidden="true" className="text-[var(--primary)]" />
            <h2 id="feedback-title" className="text-2xl font-bold">
              Feedback luyện tập AI
            </h2>
          </div>
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900">
            {feedback.disclaimer}
          </p>
          <p className="mt-5 leading-7">{feedback.summary}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Overall ước lượng"
              value={feedback.estimatedOverallBand}
            />
            <Metric
              label="Fluency ước lượng"
              value={feedback.estimatedFluencyBand}
            />
            <Metric
              label="Lexical ước lượng"
              value={feedback.estimatedLexicalBand}
            />
            <Metric
              label="Grammar ước lượng"
              value={feedback.estimatedGrammarBand}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Pronunciation: không ước lượng vì provider chỉ nhận transcript,
            không được phép bịa quan sát từ audio.
          </p>
          {criteria.length ? (
            <div className="mt-6">
              <h3 className="font-bold">Theo tiêu chí</h3>
              <dl className="mt-3 space-y-3">
                {criteria.map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-semibold">{label}</dt>
                    <dd className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <List title="Điểm mạnh" items={strengths} />
            <List title="Bước cải thiện" items={suggestions} />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[var(--primary)]"
            />
            <div>
              <h2 className="text-xl font-bold">
                Transcript và AI feedback là tùy chọn
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                Chỉ khi đồng ý, server mới gửi audio của attempt này tới
                provider. Nếu provider chưa cấu hình hoặc thất bại, hệ thống giữ
                trống thay vì tạo dữ liệu giả.
              </p>
            </div>
          </div>
          <label className="mt-5 flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <span className="text-sm leading-6">
              Tôi đồng ý gửi audio tới nhà cung cấp STT/AI để nhận transcript và
              feedback luyện tập không chính thức.
            </span>
          </label>
          <button
            type="button"
            disabled={!consent || pending || !data.aiAvailable}
            onClick={() =>
              startTransition(async () => {
                const result = await requestSpeakingAiReviewAction({
                  attemptId: data.attempt.id,
                  setSlug: data.set.slug,
                  consent: true,
                });
                setMessage(result.message);
                if (result.status === "ready") location.reload();
              })
            }
            className="mt-4 min-h-11 rounded-lg bg-[var(--primary)] px-5 py-2 font-bold text-white focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none disabled:opacity-50"
          >
            {data.aiAvailable
              ? "Tạo transcript và feedback"
              : "STT/AI chưa cấu hình"}
          </button>
          <p
            aria-live="polite"
            className="mt-3 text-sm text-[var(--muted-foreground)]"
          >
            {message}
          </p>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-[var(--surface-subtle)] p-4">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value ?? "—"}</p>
    </div>
  );
}
function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
