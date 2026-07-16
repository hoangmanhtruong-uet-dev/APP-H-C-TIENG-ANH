import { Mic2, ShieldCheck } from "lucide-react";

import { startSpeakingAction } from "@/features/speaking/actions";
import type { SpeakingPracticeData } from "@/server/speaking/content";

export function SpeakingStart({
  data,
  error,
}: {
  data: SpeakingPracticeData;
  error?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Mic2 aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-pretty">
          {data.set.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          {data.set.description}
        </p>
        <p className="mt-4 rounded-xl bg-[var(--surface-subtle)] p-4 text-sm leading-6">
          {data.set.instructions}
        </p>
        <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <li>{data.prompts.length} câu nguyên bản</li>
          <li>Khoảng {data.set.estimatedMinutes} phút</li>
          <li>Audio private</li>
        </ul>
        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            Không thể bắt đầu bài. Hãy thử lại.
          </p>
        ) : null}
        <form action={startSpeakingAction} className="mt-7">
          <input type="hidden" name="setSlug" value={data.set.slug} />
          <button className="min-h-11 rounded-lg bg-[var(--primary)] px-5 py-2.5 font-bold text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none">
            Bắt đầu ghi âm
          </button>
        </form>
      </section>
      <aside className="flex gap-3 rounded-2xl border border-[var(--border)] p-5 text-sm leading-6 text-[var(--muted-foreground)]">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-[var(--primary)]"
        />
        <p>
          Trình duyệt chỉ upload vào đường dẫn một lần do PostgreSQL cấp. Server
          xác minh file trước khi gắn vào attempt; transcript và AI feedback chỉ
          được tạo khi bạn đồng ý.
        </p>
      </aside>
    </div>
  );
}
