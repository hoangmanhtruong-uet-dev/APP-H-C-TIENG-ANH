"use client";

import {
  BookOpenText,
  ChartNoAxesCombined,
  ClipboardCheck,
  LayoutDashboard,
  Map,
  Menu,
  Mic2,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AppLogo } from "@/components/shared/app-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/learn", label: "Thư viện học", icon: BookOpenText },
  { href: "/practice/speaking", label: "Luyện Speaking", icon: Mic2 },
  { href: "/mock-tests", label: "Mock tests", icon: ClipboardCheck },
  { href: "/roadmap", label: "Lộ trình", icon: Map },
  { href: "/progress", label: "Tiến độ", icon: ChartNoAxesCombined },
  { href: "/profile", label: "Hồ sơ", icon: UserRound },
  { href: "/settings", label: "Cài đặt", icon: Settings },
] as const;

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng học tập" className="space-y-1">
      {navigation.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,transform] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none active:translate-y-px",
              isActive
                ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  account,
}: {
  children: React.ReactNode;
  account: { label: string; email: string };
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const dialog = dialogRef.current;
    const focusable = dialog
      ? Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
      : [];
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    const menuButton = menuButtonRef.current;

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      menuButton?.focus();
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>

      <aside
        inert={mobileOpen ? true : undefined}
        aria-hidden={mobileOpen ? true : undefined}
        className="sticky top-0 hidden h-[100dvh] border-r border-[var(--border)] bg-[var(--surface)] p-5 lg:flex lg:flex-col"
      >
        <AppLogo />
        <div className="mt-9 flex-1">
          <NavigationLinks />
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {account.label}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
            {account.email}
          </p>
          <LogoutButton className="mt-3" />
        </div>
      </aside>

      <div
        inert={mobileOpen ? true : undefined}
        aria-hidden={mobileOpen ? true : undefined}
        className="min-w-0"
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[color:var(--surface-translucent)] px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <AppLogo compact />
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              Xin chào, {account.label}
            </p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              Không gian học tập cá nhân
            </p>
          </div>
          <Button
            ref={menuButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Mở điều hướng"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu aria-hidden="true" size={22} strokeWidth={1.8} />
          </Button>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
        >
          {children}
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(12,20,39,0.42)] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset"
            aria-label="Đóng điều hướng"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={dialogRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Điều hướng học tập"
            className="absolute inset-y-0 right-0 flex w-[min(88vw,22rem)] flex-col overflow-y-auto overscroll-contain bg-[var(--surface)] p-5 shadow-[-18px_0_60px_rgba(17,35,77,0.18)]"
          >
            <div className="flex items-center justify-between">
              <AppLogo />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Đóng điều hướng"
                onClick={() => setMobileOpen(false)}
              >
                <X aria-hidden="true" size={22} strokeWidth={1.8} />
              </Button>
            </div>
            <div className="mt-8">
              <NavigationLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="mt-auto border-t border-[var(--border)] pt-5">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {account.label}
              </p>
              <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                {account.email}
              </p>
              <LogoutButton className="mt-3" />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
