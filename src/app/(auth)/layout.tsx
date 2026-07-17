import Link from "next/link";

import { AppLogo } from "@/components/shared/app-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <AppLogo />
        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Về trang chủ
        </Link>
      </header>
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-md px-4 py-10 sm:px-6 sm:py-16"
      >
        {children}
      </main>
    </div>
  );
}
