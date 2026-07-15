import Link from "next/link";

import { cn } from "@/lib/utils";

interface AppLogoProps {
  compact?: boolean;
  className?: string;
}

export function AppLogo({ compact = false, className }: AppLogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-h-11 items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      aria-label="IELTS Flow - Trang chủ"
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-lg bg-[var(--primary)] text-sm font-bold tracking-tight text-white shadow-[0_6px_18px_rgba(31,78,216,0.2)]"
      >
        IF
      </span>
      {!compact ? (
        <span className="text-base font-bold tracking-[-0.02em] text-[var(--foreground)]">
          IELTS Flow
        </span>
      ) : null}
    </Link>
  );
}
