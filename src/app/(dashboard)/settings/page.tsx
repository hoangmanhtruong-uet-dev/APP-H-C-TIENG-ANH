import type { Metadata } from "next";

import { LogoutButton } from "@/components/auth/logout-button";
import { PageHeader } from "@/components/shared/page-header";
import { requireCurrentAccount } from "@/server/auth/account";

export const metadata: Metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  const account = await requireCurrentAccount();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cài đặt"
        description="Quản lý phiên đăng nhập và trạng thái tài khoản hiện tại."
      />
      <section className="max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7">
        <h2 className="text-xl font-bold">Tài khoản</h2>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-[var(--muted-foreground)]">Email</dt>
            <dd className="mt-1 font-semibold break-words">
              {account.user.email}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--muted-foreground)]">
              Trạng thái xác minh
            </dt>
            <dd className="mt-1 font-semibold text-[var(--success)]">
              {account.user.emailConfirmedAt ? "Đã xác minh" : "Chưa xác minh"}
            </dd>
          </div>
        </dl>
        <div className="mt-7 border-t border-[var(--border)] pt-5">
          <LogoutButton className="w-auto px-3" />
        </div>
      </section>
    </div>
  );
}
