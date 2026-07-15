import Link from "next/link";

import { AppLogo } from "@/components/shared/app-logo";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <Container className="flex h-16 items-center justify-between gap-4">
        <AppLogo />
        <nav
          aria-label="Điều hướng chính"
          className="flex items-center gap-1 sm:gap-2"
        >
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Bắt đầu học</Link>
          </Button>
        </nav>
      </Container>
    </header>
  );
}
