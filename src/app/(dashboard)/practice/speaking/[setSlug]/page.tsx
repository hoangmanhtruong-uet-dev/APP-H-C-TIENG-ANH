import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SpeakingRunner } from "@/components/speaking/speaking-runner";
import { SpeakingStart } from "@/components/speaking/speaking-start";
import { parseMockRunnerContext } from "@/features/mock-tests/schemas";
import { getSpeakingPracticePage } from "@/server/speaking/content";

export const metadata: Metadata = { title: "Luyện Speaking" };
export default async function SpeakingPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ setSlug: string }>;
  searchParams: Promise<{
    error?: string;
    mockTestSlug?: string;
    mockSessionId?: string;
    mockSectionAttemptId?: string;
  }>;
}) {
  const [{ setSlug }, query] = await Promise.all([params, searchParams]);
  const data = await getSpeakingPracticePage(setSlug);
  if (!data) notFound();
  return data.attempt ? (
    <SpeakingRunner data={data} mockContext={parseMockRunnerContext(query)} />
  ) : (
    <SpeakingStart data={data} error={query.error} />
  );
}
