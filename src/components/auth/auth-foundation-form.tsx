import Link from "next/link";

import { Button } from "@/components/ui/button";

interface AuthFoundationFormProps {
  mode: "login" | "register";
}

export function AuthFoundationForm({ mode }: AuthFoundationFormProps) {
  const isLogin = mode === "login";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_50px_rgba(35,55,95,0.08)] sm:p-8">
      <form className="space-y-5" aria-describedby="auth-foundation-note">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-[var(--foreground)]"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="ban@example.com…"
            disabled
            className="h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--muted)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-[var(--foreground)]"
          >
            Mật khẩu
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Tối thiểu 8 ký tự…"
            disabled
            className="h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--muted)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>
        <Button type="button" className="w-full" disabled>
          {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
        </Button>
      </form>
      <p
        id="auth-foundation-note"
        role="status"
        className="mt-5 rounded-lg bg-[var(--primary-subtle)] p-3 text-sm leading-6 text-[var(--primary)]"
      >
        Biểu mẫu đang ở trạng thái nền tảng. Chưa gửi dữ liệu và chưa kết nối
        xác thực.
      </p>
      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
        {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          {isLogin ? "Đăng ký" : "Đăng nhập"}
        </Link>
      </p>
    </div>
  );
}
