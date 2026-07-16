import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListeningResult } from "@/components/listening/listening-result";
import { getListeningPracticeResult } from "@/server/listening/content";

export const metadata: Metadata = { title: "Listening result" };

export default async function ListeningResultPage({
  params,
}: {
  params: Promise<{ exerciseSlug: string; attemptId: string }>;
}) {
  const { exerciseSlug, attemptId } = await params;
  const data = await getListeningPracticeResult(exerciseSlug, attemptId);
  if (!data) notFound();
  return <ListeningResult data={data} />;
}
