import type { Metadata } from "next";

import { FoundationPage } from "@/components/shared/foundation-page";

export const metadata: Metadata = { title: "Tiến độ" };

export default function ProgressPage() {
  return (
    <FoundationPage
      title="Tiến độ"
      description="Khu vực này sẽ phân biệt dữ liệu quan sát được và chỉ số ước lượng."
      emptyTitle="Chưa có dữ liệu tiến độ"
      emptyDescription="Biểu đồ chỉ xuất hiện sau khi có phiên học thật, không dùng số liệu minh họa giả."
    />
  );
}
