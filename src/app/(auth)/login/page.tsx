import type { Metadata } from "next";

import { AuthFoundationForm } from "@/components/auth/auth-foundation-form";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào không gian tự học IELTS.",
};

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-[-0.04em] text-pretty text-[var(--foreground)]">
        Đăng nhập
      </h1>
      <p className="mt-3 leading-7 text-pretty text-[var(--muted-foreground)]">
        Route và giao diện đã sẵn sàng. Luồng xác thực Supabase chưa được bật.
      </p>
      <div className="mt-8">
        <AuthFoundationForm mode="login" />
      </div>
    </div>
  );
}
