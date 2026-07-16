import type { Metadata } from "next";

import { ModuleCatalog } from "@/components/learning/module-catalog";
import { PageHeader } from "@/components/shared/page-header";
import { getLearningCatalog } from "@/server/learning/content";

export const metadata: Metadata = {
  title: "Thư viện học",
  description: "Các module và bài học IELTS đã xuất bản.",
};

export default async function LearnPage() {
  const modules = await getLearningCatalog();
  const totalLessons = modules.reduce(
    (total, module) => total + module.totalLessons,
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Thư viện học"
        description={
          totalLessons > 0
            ? `${modules.length} module với ${totalLessons} bài học đã xuất bản và phù hợp với thiết lập IELTS của bạn.`
            : "Các module đã xuất bản và phù hợp với thiết lập IELTS của bạn sẽ xuất hiện tại đây."
        }
      />
      <ModuleCatalog modules={modules} />
    </div>
  );
}
