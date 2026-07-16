import { Clock3, FilePenLine } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { WritingCatalogItem } from "@/server/writing/content";

export function WritingCatalog({ items }: { items: WritingCatalogItem[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-bold">Chưa có Writing task đã xuất bản</h2>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Task draft không được hiển thị cho learner.
        </p>
      </section>
    );
  }
  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.slug}
          className="flex min-w-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
        >
          <FilePenLine aria-hidden="true" className="text-[var(--primary)]" />
          <p className="mt-4 text-sm font-semibold text-[var(--primary)]">
            {item.taskType === "task_2" ? "Writing Task 2" : "Writing Task 1"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-pretty break-words">
            {item.title}
          </h2>
          <p className="mt-2 flex-1 leading-7 text-[var(--muted-foreground)]">
            {item.description}
          </p>
          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
            <span>Tối thiểu {item.minimumWords} từ</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 aria-hidden="true" size={16} />
              {Math.round(item.timeLimitSeconds / 60)} phút
            </span>
            <span>
              {item.testType === "academic" ? "Academic" : "General Training"}
            </span>
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-fit">
              <Link href={`/practice/writing/${item.slug}`}>
                {item.activeDraftId ? "Tiếp tục bản nháp" : "Mở Writing task"}
              </Link>
            </Button>
            {item.latestSubmissionId ? (
              <Button asChild variant="secondary" className="w-full sm:w-fit">
                <Link
                  href={`/practice/writing/${item.slug}/submission/${item.latestSubmissionId}`}
                >
                  Xem bài đã nộp
                </Link>
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
