import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReadingRunner } from "@/components/reading/reading-runner";
import { ReadingStart } from "@/components/reading/reading-start";
import { getReadingPracticePage } from "@/server/reading/content";

export const metadata: Metadata = { title: "Luyện Reading" };

export default async function ReadingPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ exerciseSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ exerciseSlug }, query] = await Promise.all([params, searchParams]);
  const data = await getReadingPracticePage(exerciseSlug);
  if (!data) notFound();
  return data.attempt ? (
    <ReadingRunner data={data} />
  ) : (
    <ReadingStart data={data} error={query.error} />
  );
}
