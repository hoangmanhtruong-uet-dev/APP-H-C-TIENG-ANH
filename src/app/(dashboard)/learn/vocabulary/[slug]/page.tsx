import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getVocabularyEntry } from "@/server/learning/foundations";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getVocabularyEntry(slug);
  return entry ? { title: entry.term, description: entry.definitionVi } : {};
}

export default async function VocabularyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = await getVocabularyEntry(slug);
  if (!entry) notFound();
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/learn/vocabulary"
        className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" size={17} /> Vocabulary
      </Link>
      <header className="border-b border-[var(--border)] pb-7">
        <p className="text-sm font-semibold text-[var(--primary)]">
          {entry.partOfSpeech} · {entry.topic}
        </p>
        <h1 className="mt-2 text-4xl font-bold">{entry.term}</h1>
        <p className="mt-4 text-lg leading-8">{entry.definitionVi}</p>
      </header>
      <section aria-labelledby="example-title">
        <h2 id="example-title" className="text-xl font-bold">
          Ví dụ nguyên bản
        </h2>
        <blockquote className="mt-4 border-l-4 border-[var(--primary)] pl-5 text-lg leading-8 text-[var(--muted-foreground)]">
          {entry.exampleSentence}
        </blockquote>
      </section>
      <div className="flex flex-wrap gap-2" aria-label="Tags">
        {entry.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-[var(--muted)] px-3 py-1 text-sm"
          >
            {tag}
          </span>
        ))}
      </div>
      {entry.exerciseSlug ? (
        <Button asChild>
          <Link href={`/practice/${entry.exerciseSlug}`}>
            Luyện từ trong exercise
          </Link>
        </Button>
      ) : null}
    </article>
  );
}
