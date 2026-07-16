import { AppLogo } from "@/components/shared/app-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireCurrentAccount } from "@/server/auth/account";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCurrentAccount();

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppLogo />
          <LogoutButton className="w-auto" />
        </div>
      </header>
      <main id="main-content" className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {children}
      </main>
    </div>
  );
}
