import type { Metadata } from "next";

import { ProgressAnalytics } from "@/components/analytics/progress-analytics";
import { PageHeader } from "@/components/shared/page-header";
import { getLearnerAnalytics } from "@/server/analytics/content";

export const metadata: Metadata = {
  title: "Tiến độ học tập",
  description:
    "Tiến độ được tổng hợp từ hoạt động học và bài làm đã lưu trong PostgreSQL.",
};

export default async function ProgressPage() {
  const analytics = await getLearnerAnalytics(12);

  return (
    <div className="space-y-9">
      <PageHeader
        title="Tiến độ học tập"
        description="Số liệu dưới đây đến từ lesson progress, bài luyện tập, Writing, Speaking và Mock Test đã lưu trong PostgreSQL. Hệ thống không tạo điểm hoặc band minh họa."
      />
      <ProgressAnalytics analytics={analytics} />
    </div>
  );
}
