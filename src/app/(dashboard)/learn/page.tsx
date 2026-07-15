import type { Metadata } from "next";

import { FoundationPage } from "@/components/shared/foundation-page";

export const metadata: Metadata = { title: "Học hôm nay" };

export default function LearnPage() {
  return (
    <FoundationPage
      title="Học hôm nay"
      description="Nơi bắt đầu các nhiệm vụ Reading, Listening, Writing và Speaking theo kế hoạch."
      emptyTitle="Chưa có kế hoạch học"
      emptyDescription="Daily task sẽ được tạo từ goal và study plan ở Phase 2."
    />
  );
}
