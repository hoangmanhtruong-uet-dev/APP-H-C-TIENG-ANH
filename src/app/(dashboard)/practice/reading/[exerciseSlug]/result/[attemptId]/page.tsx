import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReadingResult } from "@/components/reading/reading-result";
import { getReadingPracticeResult } from "@/server/reading/content";

export const metadata: Metadata = { title: "Kết quả Reading" };

export default async function ReadingResultPage({
  params,
}: {
  params: Promise<{ exerciseSlug: string; attemptId: string }>;
}) {
  const { exerciseSlug, attemptId } = await params;
  const data = await getReadingPracticeResult(exerciseSlug, attemptId);
  if (!data) notFound();
  return <ReadingResult data={data} />;
}
