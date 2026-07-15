import { AppShell } from "@/components/layout/app-shell";
import { getAccountLabel, requireCurrentAccount } from "@/server/auth/account";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await requireCurrentAccount();

  return (
    <AppShell
      account={{
        label: getAccountLabel(account),
        email: account.user.email,
      }}
    >
      {children}
    </AppShell>
  );
}
