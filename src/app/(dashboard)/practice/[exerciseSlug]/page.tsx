import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PracticeRunner } from "@/components/practice/practice-runner";
import { getPracticePage } from "@/server/practice/content";

export const metadata: Metadata = { title: "Luyện tập" };

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ exerciseSlug: string }>;
  searchParams: Promise<{ question?: string; saved?: string; error?: string }>;
}) {
  const [{ exerciseSlug }, query] = await Promise.all([params, searchParams]);
  const requestedPosition = query.question ? Number(query.question) : undefined;
  const data = await getPracticePage(exerciseSlug, requestedPosition);
  if (!data) notFound();
  return (
    <PracticeRunner
      data={data}
      saved={query.saved === "1"}
      error={query.error}
    />
  );
}
