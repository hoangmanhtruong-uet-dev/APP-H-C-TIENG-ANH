import type { Metadata } from "next";

import { FoundationPage } from "@/components/shared/foundation-page";

export const metadata: Metadata = { title: "Cài đặt" };

export default function SettingsPage() {
  return (
    <FoundationPage
      title="Cài đặt"
      description="Cài đặt học tập, thông báo và quyền riêng tư sẽ được thêm theo từng phase."
      emptyTitle="Chưa có cài đặt khả dụng"
      emptyDescription="Phase 1 chỉ cung cấp route, layout và trạng thái nền tảng trung thực."
    />
  );
}
