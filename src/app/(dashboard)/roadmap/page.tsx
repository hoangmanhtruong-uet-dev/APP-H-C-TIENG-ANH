import type { Metadata } from "next";

import { FoundationPage } from "@/components/shared/foundation-page";

export const metadata: Metadata = { title: "Lộ trình" };

export default function RoadmapPage() {
  return (
    <FoundationPage
      title="Lộ trình"
      description="Study plan theo tuần sẽ ưu tiên tối đa 2 kỹ năng trọng tâm và một kỹ năng duy trì."
      emptyTitle="Lộ trình chưa được tạo"
      emptyDescription="Plan generator deterministic thuộc Phase 2, chưa có dữ liệu mẫu thay thế."
    />
  );
}
