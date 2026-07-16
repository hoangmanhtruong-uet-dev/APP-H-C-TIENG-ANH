import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WritingReview } from "@/components/writing/writing-review";
import { getWritingSubmissionReview } from "@/server/writing/content";

export const metadata: Metadata = { title: "Bài Writing đã nộp" };

export default async function WritingSubmissionPage({
  params,
}: {
  params: Promise<{ taskSlug: string; submissionId: string }>;
}) {
  const { taskSlug, submissionId } = await params;
  const data = await getWritingSubmissionReview(taskSlug, submissionId);
  if (!data) notFound();
  return <WritingReview data={data} />;
}
