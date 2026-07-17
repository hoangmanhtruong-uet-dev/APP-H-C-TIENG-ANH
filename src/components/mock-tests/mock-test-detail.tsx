import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { startMockTestAction } from "@/features/mock-tests/actions";
import {
  formatMockDuration,
  formatMockSectionType,
} from "@/features/mock-tests/model";
import type { MockTestDetailData } from "@/server/mock-tests/content";

export function MockTestDetail({
  data,
  error,
}: {
  data: MockTestDetailData;
  error?: string;
}) {
  return (
    <div className="space-y-7">
      <Link
        href="/mock-tests"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" size={17} /> Danh sách mock tests
      </Link>
      <header className="max-w-3xl">
        <p className="text-sm font-semibold text-[var(--primary)]">
          {data.version.test_type} · {data.version.difficulty}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty sm:text-4xl">
          {data.version.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          {data.version.description}
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-[var(--danger-subtle)] px-4 py-3 font-semibold"
        >
          Chưa thể bắt đầu mock test. Vui lòng thử lại.
        </p>
      ) : null}

      <ol className="grid gap-4 sm:grid-cols-2">
        {data.sections.map((section) => (
          <li
            key={section.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <p className="text-sm font-semibold text-[var(--primary)]">
              Section {section.order}
            </p>
            <h2 className="mt-1 text-lg font-bold">
              {formatMockSectionType(section.type)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {section.title}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
              <Clock3 aria-hidden="true" size={16} />
              {formatMockDuration(section.timeLimitSeconds)}
            </p>
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <h2 className="font-bold">Sẵn sàng làm bài?</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Mỗi section được mở theo thứ tự. Phiên đang làm sẽ được tiếp tục
            thay vì tạo bản sao.
          </p>
        </div>
        {data.activeSessionId ? (
          <Button asChild className="mt-4 shrink-0 sm:mt-0">
            <Link
              href={`/mock-tests/${data.test.slug}/session/${data.activeSessionId}`}
            >
              Tiếp tục <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </Button>
        ) : (
          <form action={startMockTestAction} className="mt-4 shrink-0 sm:mt-0">
            <input type="hidden" name="mockTestSlug" value={data.test.slug} />
            <Button type="submit">
              Bắt đầu mock test <ArrowRight aria-hidden="true" size={17} />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
