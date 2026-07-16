import type { Metadata } from "next";
import Link from "next/link";

import { VocabularyCatalog } from "@/components/learning/vocabulary-catalog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { getVocabularyCatalog } from "@/server/learning/foundations";

export const metadata: Metadata = {
  title: "Vocabulary",
  description: "Từ vựng IELTS nguyên bản được đọc từ PostgreSQL.",
};

export default async function VocabularyPage() {
  const entries = await getVocabularyCatalog();
  const exerciseSlug = entries.find(
    (entry) => entry.exerciseSlug,
  )?.exerciseSlug;
  return (
    <div className="space-y-8">
      <PageHeader
        title="Vocabulary nền tảng"
        description={`${entries.length} từ đã xuất bản, có định nghĩa tiếng Việt và ví dụ nguyên bản.`}
      />
      {exerciseSlug ? (
        <Button asChild>
          <Link href={`/practice/${exerciseSlug}`}>Luyện Vocabulary</Link>
        </Button>
      ) : null}
      <VocabularyCatalog entries={entries} />
    </div>
  );
}
