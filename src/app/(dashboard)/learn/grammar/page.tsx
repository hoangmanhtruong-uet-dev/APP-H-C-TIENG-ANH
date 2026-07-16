import type { Metadata } from "next";
import Link from "next/link";

import { GrammarCatalog } from "@/components/learning/grammar-catalog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getGrammarCatalog } from "@/server/learning/foundations";

export const metadata: Metadata = {
  title: "Grammar",
  description: "Chủ điểm Grammar IELTS từ PostgreSQL.",
};

export default async function GrammarPage() {
  const topics = await getGrammarCatalog();
  const exerciseSlug = topics.find((topic) => topic.exerciseSlug)?.exerciseSlug;
  return (
    <div className="space-y-8">
      <PageHeader
        title="Grammar nền tảng"
        description={`${topics.length} chủ điểm đã xuất bản, có ví dụ và lỗi thường gặp.`}
      />
      {exerciseSlug ? (
        <Button asChild>
          <Link href={`/practice/${exerciseSlug}`}>Luyện Grammar</Link>
        </Button>
      ) : null}
      <GrammarCatalog topics={topics} />
    </div>
  );
}
