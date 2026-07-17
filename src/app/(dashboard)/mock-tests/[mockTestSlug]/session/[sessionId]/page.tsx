import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MockTestSession } from "@/components/mock-tests/mock-test-session";
import { getMockSessionPage } from "@/server/mock-tests/content";

export const metadata: Metadata = { title: "Làm mock test" };

export default async function MockTestSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ mockTestSlug: string; sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ mockTestSlug, sessionId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const data = await getMockSessionPage(mockTestSlug, sessionId);
  if (!data) notFound();
  return <MockTestSession data={data} error={query.error} />;
}
