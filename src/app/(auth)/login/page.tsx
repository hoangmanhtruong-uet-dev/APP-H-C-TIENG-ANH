import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { getConfirmationMessage } from "@/features/auth/errors";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào không gian tự học IELTS.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; authError?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-[-0.04em] text-pretty text-[var(--foreground)]">
        Đăng nhập
      </h1>
      <p className="mt-3 leading-7 text-pretty text-[var(--muted-foreground)]">
        Tiếp tục lộ trình học bằng tài khoản đã xác minh của bạn.
      </p>
      <div className="mt-8">
        <LoginForm
          next={params.next}
          initialMessage={getConfirmationMessage(params.authError)}
        />
      </div>
    </div>
  );
}
