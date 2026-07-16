import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PracticeResultView } from "@/components/practice/practice-result";
import { attemptRouteSchema } from "@/features/practice/schemas";
import { getPracticeResult } from "@/server/practice/content";

export const metadata: Metadata = { title: "Kết quả luyện tập" };

export default async function PracticeResultPage({
  params,
}: {
  params: Promise<{ exerciseSlug: string; attemptId: string }>;
}) {
  const parsed = attemptRouteSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const data = await getPracticeResult(parsed.data.attemptId);
  if (!data || data.exercise.slug !== parsed.data.exerciseSlug) notFound();
  return <PracticeResultView data={data} />;
}
