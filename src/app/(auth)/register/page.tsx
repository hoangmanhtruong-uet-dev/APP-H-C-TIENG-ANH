import type { Metadata } from "next";

import { AuthFoundationForm } from "@/components/auth/auth-foundation-form";

export const metadata: Metadata = {
  title: "Đăng ký",
  description: "Tạo hồ sơ để bắt đầu lộ trình tự học IELTS.",
};

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-[-0.04em] text-pretty text-[var(--foreground)]">
        Tạo tài khoản
      </h1>
      <p className="mt-3 leading-7 text-pretty text-[var(--muted-foreground)]">
        Chưa có dữ liệu nào được gửi. Xác thực sẽ được triển khai trong track
        Auth.
      </p>
      <div className="mt-8">
        <AuthFoundationForm mode="register" />
      </div>
    </div>
  );
}
