import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListeningRunner } from "@/components/listening/listening-runner";
import { ListeningStart } from "@/components/listening/listening-start";
import { getListeningPracticePage } from "@/server/listening/content";

export const metadata: Metadata = { title: "Listening practice" };

export default async function ListeningPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ exerciseSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ exerciseSlug }, query] = await Promise.all([params, searchParams]);
  const data = await getListeningPracticePage(exerciseSlug);
  if (!data) notFound();
  return data.attempt ? (
    <ListeningRunner data={data} />
  ) : (
    <ListeningStart data={data} error={query.error} />
  );
}
