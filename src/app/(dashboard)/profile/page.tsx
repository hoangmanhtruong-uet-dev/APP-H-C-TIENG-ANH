import type { Metadata } from "next";

import { FoundationPage } from "@/components/shared/foundation-page";

export const metadata: Metadata = { title: "Hồ sơ" };

export default function ProfilePage() {
  return (
    <FoundationPage
      title="Hồ sơ"
      description="Hồ sơ sẽ lưu timezone, locale và mục tiêu band của chính người học."
      emptyTitle="Chưa kết nối hồ sơ"
      emptyDescription="Bảng profiles, Auth và RLS sẽ được triển khai trong track xác thực."
    />
  );
}
