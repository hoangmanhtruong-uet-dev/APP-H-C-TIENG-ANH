import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LessonReader } from "@/components/learning/lesson-reader";
import { getLessonReader } from "@/server/learning/content";

export const metadata: Metadata = { title: "Bài học" };

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleSlug: string; lessonSlug: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const [{ moduleSlug, lessonSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const rawSection = Array.isArray(query.section)
    ? query.section[0]
    : query.section;
  const sectionOrder = rawSection ? Number(rawSection) : undefined;
  const data = await getLessonReader(moduleSlug, lessonSlug, sectionOrder);
  if (!data) notFound();

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <li>
            <Link
              href={`/learn/${data.module.slug}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              <ArrowLeft aria-hidden="true" size={17} /> {data.module.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li
            aria-current="page"
            className="font-medium text-[var(--foreground)]"
          >
            {data.lesson.title}
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl border-b border-[var(--border)] pb-8">
        <p className="text-sm font-semibold text-[var(--primary)]">
          {data.lesson.estimatedMinutes} phút
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-pretty sm:text-4xl">
          {data.lesson.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-pretty text-[var(--muted-foreground)]">
          {data.lesson.summary}
        </p>
      </header>

      <LessonReader data={data} />
    </div>
  );
}
