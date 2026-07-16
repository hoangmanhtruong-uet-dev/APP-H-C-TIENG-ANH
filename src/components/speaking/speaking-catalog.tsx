import { ArrowRight, Clock3, Mic2 } from "lucide-react";
import Link from "next/link";

import type { SpeakingCatalogItem } from "@/server/speaking/content";

export function SpeakingCatalog({ items }: { items: SpeakingCatalogItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--border-strong)] p-8 text-center text-[var(--muted-foreground)]">
        Chưa có bộ Speaking đã xuất bản phù hợp. Draft không được hiển thị cho
        learner.
      </p>
    );
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.slug}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
              {item.difficulty}
            </span>
            <Mic2
              aria-hidden="true"
              className="text-[var(--primary)]"
              size={22}
            />
          </div>
          <h2 className="mt-5 text-xl font-bold text-pretty">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {item.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-2">
              <Clock3 aria-hidden="true" size={16} />
              {item.estimatedMinutes} phút
            </span>
            <span>{item.promptCount} câu</span>
            <span>{item.testType}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/practice/speaking/${item.slug}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-bold text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {item.activeAttemptId ? "Tiếp tục luyện" : "Mở bài luyện"}
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
            {item.latestAttemptId ? (
              <Link
                href={`/practice/speaking/${item.slug}/attempt/${item.latestAttemptId}`}
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border-strong)] px-4 py-2 font-bold hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                Xem bài gần nhất
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
