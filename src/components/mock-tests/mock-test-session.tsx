import { ArrowRight, Check, Clock3, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  startMockSectionAction,
  submitMockTestAction,
} from "@/features/mock-tests/actions";
import {
  formatMockDuration,
  formatMockSectionType,
  formatMockSessionStatus,
} from "@/features/mock-tests/model";
import type { MockSessionPageData } from "@/server/mock-tests/content";

const errors: Record<string, string> = {
  "section-start":
    "Chưa thể mở section. Hãy hoàn thành section trước đó rồi thử lại.",
  "section-route": "Section đã mở nhưng chưa xác định được đường dẫn nội dung.",
  incomplete: "Chỉ có thể nộp mock test sau khi đủ bốn section.",
  summary: "Bài đã nộp nhưng chưa thể tạo trang tổng kết. Hãy thử lại.",
};

export function MockTestSession({
  data,
  error,
}: {
  data: MockSessionPageData;
  error?: string;
}) {
  const firstPendingIndex = data.sections.findIndex(
    (section) => section.attempt?.status !== "submitted",
  );
  const allSubmitted = firstPendingIndex === -1;

  return (
    <div className="space-y-7">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold text-[var(--primary)]">
          {formatMockSessionStatus(data.session.status)}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty sm:text-4xl">
          {data.version.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          Thực hiện đúng thứ tự. PostgreSQL kiểm tra quyền sở hữu, phiên bản đã
          ghim và trạng thái của từng section trước mọi lần chuyển bước.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-[var(--danger-subtle)] px-4 py-3 font-semibold"
        >
          {errors[error] ?? "Yêu cầu chưa thể xử lý. Vui lòng thử lại."}
        </p>
      ) : null}

      <ol className="space-y-4">
        {data.sections.map((section, index) => {
          const status = section.attempt?.status;
          const isCurrent = index === firstPendingIndex;
          const isLocked = !allSubmitted && index > firstPendingIndex;
          return (
            <li
              key={section.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex sm:items-center sm:justify-between sm:gap-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-sm font-bold">
                    {status === "submitted" ? (
                      <Check aria-hidden="true" size={17} />
                    ) : (
                      section.order
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--primary)]">
                      {formatMockSectionType(section.type)}
                    </p>
                    <h2 className="font-bold text-pretty">{section.title}</h2>
                  </div>
                </div>
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <Clock3 aria-hidden="true" size={16} />
                  {formatMockDuration(section.timeLimitSeconds)}
                  <span aria-hidden="true">·</span>
                  {status === "submitted"
                    ? "Đã nộp"
                    : status === "in_progress"
                      ? "Đang làm"
                      : isLocked
                        ? "Chưa mở"
                        : "Sẵn sàng"}
                </p>
              </div>

              <div className="mt-4 shrink-0 sm:mt-0">
                {status === "submitted" ? (
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-[var(--muted-foreground)]">
                    <Check aria-hidden="true" size={17} /> Hoàn tất
                  </span>
                ) : isLocked ? (
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-[var(--muted-foreground)]">
                    <LockKeyhole aria-hidden="true" size={17} /> Đã khóa
                  </span>
                ) : section.practicePath ? (
                  <Button asChild>
                    <Link href={section.practicePath}>
                      Tiếp tục <ArrowRight aria-hidden="true" size={17} />
                    </Link>
                  </Button>
                ) : isCurrent ? (
                  <form action={startMockSectionAction}>
                    <input
                      type="hidden"
                      name="mockTestSlug"
                      value={data.test.slug}
                    />
                    <input
                      type="hidden"
                      name="sessionId"
                      value={data.session.id}
                    />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <Button type="submit">
                      Mở section <ArrowRight aria-hidden="true" size={17} />
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {data.session.status === "completed" ? (
        <Button asChild className="w-full sm:w-auto">
          <Link
            href={`/mock-tests/${data.test.slug}/session/${data.session.id}/summary`}
          >
            Xem tổng kết <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </Button>
      ) : allSubmitted ? (
        <section className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-5">
          <h2 className="font-bold">Nộp toàn bộ mock test</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Kết quả chỉ gồm điểm thô Reading/Listening và trạng thái bài
            Writing/Speaking. Phase 10A không quy đổi overall band.
          </p>
          <form action={submitMockTestAction} className="mt-4">
            <input type="hidden" name="mockTestSlug" value={data.test.slug} />
            <input type="hidden" name="sessionId" value={data.session.id} />
            <Button type="submit" className="w-full sm:w-auto">
              Nộp và tạo tổng kết
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
