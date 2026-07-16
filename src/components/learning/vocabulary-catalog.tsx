import { ArrowRight, BookOpenText } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import type { VocabularyEntry } from "@/server/learning/foundations";

const partLabels: Record<string, string> = {
  noun: "danh từ",
  verb: "động từ",
  adjective: "tính từ",
  adverb: "trạng từ",
  phrase: "cụm từ",
};

export function VocabularyCatalog({ entries }: { entries: VocabularyEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Chưa có từ vựng đã xuất bản"
        description="Draft content không được hiển thị thay thế."
      />
    );
  }
  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                {partLabels[entry.partOfSpeech] ?? entry.partOfSpeech}
              </p>
              <h2 className="mt-1 text-xl font-bold">{entry.term}</h2>
            </div>
            <BookOpenText
              aria-hidden="true"
              className="text-[var(--muted-foreground)]"
              size={21}
            />
          </div>
          <p className="mt-4 line-clamp-2 leading-7 text-[var(--muted-foreground)]">
            {entry.definitionVi}
          </p>
          <Link
            href={`/learn/vocabulary/${entry.slug}`}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            Học từ này <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </li>
      ))}
    </ol>
  );
}
