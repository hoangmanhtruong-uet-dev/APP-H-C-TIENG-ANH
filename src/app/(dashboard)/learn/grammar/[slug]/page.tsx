import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LessonMarkdown } from "@/components/learning/lesson-markdown";
import { Button } from "@/components/ui/button";
import { getGrammarTopic } from "@/server/learning/foundations";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getGrammarTopic(slug);
  return topic ? { title: topic.title } : {};
}

export default async function GrammarDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = await getGrammarTopic(slug);
  if (!topic) notFound();
  return (
    <article className="mx-auto max-w-3xl space-y-9">
      <Link
        href="/learn/grammar"
        className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" size={17} /> Grammar
      </Link>
      <header className="border-b border-[var(--border)] pb-7">
        <p className="text-sm font-semibold text-[var(--primary)]">
          {topic.difficulty}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-pretty">{topic.title}</h1>
      </header>
      <section aria-labelledby="explanation-title">
        <h2 id="explanation-title" className="text-xl font-bold">
          Giải thích
        </h2>
        <div className="mt-4">
          <LessonMarkdown>{topic.explanationMarkdown}</LessonMarkdown>
        </div>
      </section>
      <section aria-labelledby="examples-title">
        <h2 id="examples-title" className="text-xl font-bold">
          Ví dụ đúng
        </h2>
        <ul className="mt-4 space-y-4">
          {topic.examples.map((example) => (
            <li
              key={example.correct}
              className="flex gap-3 rounded-xl border border-[var(--border)] p-5"
            >
              <CheckCircle2
                aria-hidden="true"
                className="mt-1 shrink-0 text-[var(--success)]"
                size={20}
              />
              <div>
                <p className="leading-7 font-semibold">{example.correct}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  {example.note}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="mistakes-title">
        <h2 id="mistakes-title" className="text-xl font-bold">
          Lỗi thường gặp
        </h2>
        <ul className="mt-4 space-y-4">
          {topic.commonMistakes.map((mistake) => (
            <li
              key={mistake.wrong}
              className="flex gap-3 rounded-xl border border-[var(--border)] p-5"
            >
              <XCircle
                aria-hidden="true"
                className="mt-1 shrink-0 text-[var(--destructive)]"
                size={20}
              />
              <div>
                <p className="leading-7 font-semibold line-through">
                  {mistake.wrong}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  {mistake.correction}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {topic.exerciseSlug ? (
        <Button asChild>
          <Link href={`/practice/${topic.exerciseSlug}`}>
            Luyện chủ điểm này
          </Link>
        </Button>
      ) : null}
    </article>
  );
}
