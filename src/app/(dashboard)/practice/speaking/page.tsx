import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { SpeakingCatalog } from "@/components/speaking/speaking-catalog";
import { getSpeakingCatalog } from "@/server/speaking/content";

export const metadata: Metadata = {
  title: "Speaking practice",
  description: "Luyện Speaking với audio private và review tùy chọn.",
};
export default async function SpeakingCatalogPage() {
  const items = await getSpeakingCatalog();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Speaking practice"
        description="Ghi âm vào private Storage, xác minh phía server, nộp attempt bất biến và tùy chọn nhận feedback luyện tập không chính thức."
      />
      <SpeakingCatalog items={items} />
    </div>
  );
}
