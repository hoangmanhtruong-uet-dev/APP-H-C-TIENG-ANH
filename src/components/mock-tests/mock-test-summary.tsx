import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { MockSessionPageData } from "@/server/mock-tests/content";

export function MockTestSummary({ data }: { data: MockSessionPageData }) {
  const result = data.result;
  return (
    <div className="space-y-7">
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
          <CheckCircle2 aria-hidden="true" size={18} /> Đã hoàn thành
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty sm:text-4xl">
          Tổng kết {data.version.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          Đây là dữ liệu kết quả trực tiếp từ PostgreSQL. Phase 10A không suy
          diễn overall score hoặc IELTS band.
        </p>
      </header>

      <dl className="grid gap-4 sm:grid-cols-2">
        <ResultCard
          label="Reading"
          value={rawScore(result?.reading_score, result?.reading_max_score)}
          description="Điểm thô / điểm tối đa"
        />
        <ResultCard
          label="Listening"
          value={rawScore(result?.listening_score, result?.listening_max_score)}
          description="Điểm thô / điểm tối đa"
        />
        <ResultCard
          label="Writing"
          value={result?.writing_submission_id ? "Đã nộp" : "Chưa có dữ liệu"}
          description="Bài viết được giữ trong submission riêng tư của bạn"
        />
        <ResultCard
          label="Speaking"
          value={result?.speaking_attempt_id ? "Đã nộp" : "Chưa có dữ liệu"}
          description="Audio được giữ trong attempt và storage riêng tư của bạn"
        />
      </dl>

      <Button asChild variant="secondary">
        <Link href="/mock-tests">
          <ArrowLeft aria-hidden="true" size={17} /> Về danh sách mock tests
        </Link>
      </Button>
    </div>
  );
}

function ResultCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <dt className="text-sm font-semibold text-[var(--primary)]">{label}</dt>
      <dd className="mt-2 text-2xl font-bold tabular-nums">{value}</dd>
      <dd className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </dd>
    </div>
  );
}

function rawScore(
  score: number | null | undefined,
  max: number | null | undefined,
) {
  return score === null ||
    score === undefined ||
    max === null ||
    max === undefined
    ? "Chưa có dữ liệu"
    : `${score}/${max}`;
}
