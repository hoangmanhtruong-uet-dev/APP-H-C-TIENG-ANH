import { Clock3, Headphones } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ListeningCatalogItem } from "@/server/listening/content";

export function ListeningCatalog({ items }: { items: ListeningCatalogItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-bold">Chưa có bài Listening đã xuất bản</h2>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Nội dung draft được bảo vệ bởi RLS và không hiển thị cho learner.
        </p>
      </div>
    );
  }
  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.slug}
          className="flex min-w-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
        >
          <Headphones aria-hidden="true" className="text-[var(--primary)]" />
          <h2 className="mt-4 text-xl font-bold text-pretty break-words">
            {item.title}
          </h2>
          <p className="mt-2 flex-1 leading-7 text-[var(--muted-foreground)]">
            {item.summary}
          </p>
          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
            <span>{item.questionCount} câu</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 aria-hidden="true" size={16} />
              {Math.round(item.timeLimitSeconds / 60)} phút
            </span>
            <span>Audio {Math.ceil(item.durationSeconds / 60)} phút</span>
            <span>
              {item.testType === "academic" ? "Academic" : "General Training"}
            </span>
          </p>
          <Button asChild className="mt-5 min-h-11 w-full sm:w-fit">
            <Link href={`/practice/listening/${item.slug}`}>
              Mở bài Listening
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}
