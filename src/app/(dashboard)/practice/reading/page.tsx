import type { Metadata } from "next";

import { ReadingCatalog } from "@/components/reading/reading-catalog";
import { PageHeader } from "@/components/shared/page-header";
import { getReadingCatalog } from "@/server/reading/content";

export const metadata: Metadata = {
  title: "Reading practice",
  description:
    "Bài Reading nguyên bản với autosave và chấm điểm deterministic.",
};

export default async function ReadingCatalogPage() {
  const items = await getReadingCatalog();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Reading practice"
        description="Đọc passage, lưu tiến độ trong PostgreSQL và nhận điểm từ snapshot nội dung đã xuất bản."
      />
      <ReadingCatalog items={items} />
    </div>
  );
}
