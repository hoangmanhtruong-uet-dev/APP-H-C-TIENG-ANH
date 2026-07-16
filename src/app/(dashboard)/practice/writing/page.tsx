import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { WritingCatalog } from "@/components/writing/writing-catalog";
import { getWritingCatalog } from "@/server/writing/content";

export const metadata: Metadata = {
  title: "Writing practice",
  description:
    "Writing Task 2 nguyên bản với PostgreSQL autosave và optional AI feedback.",
};

export default async function WritingCatalogPage() {
  const items = await getWritingCatalog();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Writing practice"
        description="Viết, autosave có xử lý xung đột, nộp bài bất biến và tùy chọn nhận góp ý AI không phải điểm IELTS chính thức."
      />
      <WritingCatalog items={items} />
    </div>
  );
}
