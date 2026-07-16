import type { Metadata } from "next";

import { ListeningCatalog } from "@/components/listening/listening-catalog";
import { PageHeader } from "@/components/shared/page-header";
import { getListeningCatalog } from "@/server/listening/content";

export const metadata: Metadata = {
  title: "Listening practice",
  description:
    "Bài Listening nguyên bản với audio kiểm soát, autosave và chấm điểm deterministic.",
};

export default async function ListeningCatalogPage() {
  const items = await getListeningCatalog();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Listening practice"
        description="Nghe audio nguyên bản, lưu tiến độ trong PostgreSQL và review transcript sau khi nộp."
      />
      <ListeningCatalog items={items} />
    </div>
  );
}
