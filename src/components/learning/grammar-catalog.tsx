import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import type { GrammarTopic } from "@/server/learning/foundations";

export function GrammarCatalog({ topics }: { topics: GrammarTopic[] }) {
  if (topics.length === 0) {
    return (
      <EmptyState
        title="Chưa có chủ điểm Grammar đã xuất bản"
        description="Draft content không được hiển thị thay thế."
      />
    );
  }
  return (
    <ol className="space-y-4">
      {topics.map((topic, index) => (
        <li
          key={topic.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                Chủ điểm {index + 1}
              </p>
              <h2 className="mt-1 text-xl font-bold text-pretty">
                {topic.title}
              </h2>
            </div>
            <span className="text-sm text-[var(--muted-foreground)]">
              {topic.difficulty}
            </span>
          </div>
          <Link
            href={`/learn/grammar/${topic.slug}`}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            Mở chủ điểm <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </li>
      ))}
    </ol>
  );
}
