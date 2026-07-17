import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListeningRunner } from "@/components/listening/listening-runner";
import { ListeningStart } from "@/components/listening/listening-start";
import { parseMockRunnerContext } from "@/features/mock-tests/schemas";
import { getListeningPracticePage } from "@/server/listening/content";

export const metadata: Metadata = { title: "Listening practice" };

export default async function ListeningPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ exerciseSlug: string }>;
  searchParams: Promise<{
    error?: string;
    mockTestSlug?: string;
    mockSessionId?: string;
    mockSectionAttemptId?: string;
  }>;
}) {
  const [{ exerciseSlug }, query] = await Promise.all([params, searchParams]);
  const data = await getListeningPracticePage(exerciseSlug);
  if (!data) notFound();
  return data.attempt ? (
    <ListeningRunner data={data} mockContext={parseMockRunnerContext(query)} />
  ) : (
    <ListeningStart data={data} error={query.error} />
  );
}
