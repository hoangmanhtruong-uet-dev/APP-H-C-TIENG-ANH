import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SpeakingReview } from "@/components/speaking/speaking-review";
import { getSpeakingAttemptReview } from "@/server/speaking/content";

export const metadata: Metadata = { title: "Review Speaking" };
export default async function SpeakingAttemptPage({
  params,
}: {
  params: Promise<{ setSlug: string; attemptId: string }>;
}) {
  const { setSlug, attemptId } = await params;
  const data = await getSpeakingAttemptReview(setSlug, attemptId);
  if (!data) notFound();
  return <SpeakingReview data={data} />;
}
