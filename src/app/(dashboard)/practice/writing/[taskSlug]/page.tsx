import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WritingRunner } from "@/components/writing/writing-runner";
import { WritingStart } from "@/components/writing/writing-start";
import { getWritingPracticePage } from "@/server/writing/content";

export const metadata: Metadata = { title: "Luyện Writing" };

export default async function WritingPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ taskSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ taskSlug }, query] = await Promise.all([params, searchParams]);
  const data = await getWritingPracticePage(taskSlug);
  if (!data) notFound();
  return data.submission ? (
    <WritingRunner data={data} />
  ) : (
    <WritingStart data={data} error={query.error} />
  );
}
