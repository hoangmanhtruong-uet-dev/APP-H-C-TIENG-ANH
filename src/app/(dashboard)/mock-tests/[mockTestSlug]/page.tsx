import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MockTestDetail } from "@/components/mock-tests/mock-test-detail";
import { getMockTestDetail } from "@/server/mock-tests/content";

export const metadata: Metadata = { title: "Chi tiết mock test" };

export default async function MockTestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ mockTestSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ mockTestSlug }, query] = await Promise.all([params, searchParams]);
  const data = await getMockTestDetail(mockTestSlug);
  if (!data) notFound();
  return <MockTestDetail data={data} error={query.error} />;
}
