import { ArrowRight, Clock3, FileCheck2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatMockSessionStatus } from "@/features/mock-tests/model";
import type { MockCatalogItem } from "@/server/mock-tests/content";

export function MockTestCatalog({ tests }: { tests: MockCatalogItem[] }) {
  return (
    <div className="space-y-7">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold text-[var(--primary)]">Phase 10A</p>
        <h1 className="mt-2 text-3xl font-bold text-pretty sm:text-4xl">
          Mock tests
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          Hoàn thành tuần tự Reading, Listening, Writing và Speaking. Tiến độ,
          thời gian và kết quả thô được ghi nhận bởi PostgreSQL.
        </p>
      </header>

      {tests.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          Chưa có mock test đã xuất bản phù hợp với tài khoản này.
        </p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {tests.map((test) => (
            <li
              key={test.slug}
              className="flex min-w-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <FileCheck2
                  aria-hidden="true"
                  className="shrink-0 text-[var(--primary)]"
                  size={24}
                />
                <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-semibold">
                  {test.testType}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-bold text-pretty">
                {test.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted-foreground)]">
                {test.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <Clock3 aria-hidden="true" size={16} />{" "}
                  {test.estimatedMinutes} phút
                </span>
                <span>{test.sectionCount} sections</span>
                <span>{test.difficulty}</span>
              </div>
              {test.activeSessionStatus ? (
                <p className="mt-4 text-sm font-semibold text-[var(--primary)]">
                  {formatMockSessionStatus(test.activeSessionStatus)}
                </p>
              ) : null}
              <Button asChild className="mt-5 w-full">
                <Link href={`/mock-tests/${test.slug}`}>
                  {test.activeSessionId ? "Tiếp tục mock test" : "Xem cấu trúc"}
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
