import type { Metadata } from "next";

import { ProfileForm } from "@/components/profile/profile-form";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireCurrentAccount } from "@/server/auth/account";

export const metadata: Metadata = { title: "Hồ sơ" };

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "long",
  timeZone: "Asia/Ho_Chi_Minh",
});

export default async function ProfilePage() {
  const account = await requireCurrentAccount();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hồ sơ"
        description="Thông tin tài khoản được đọc trực tiếp từ Supabase Auth và PostgreSQL."
      />
      {!account.profile ? (
        <ErrorState
          title="Chưa tìm thấy hồ sơ"
          description="Tài khoản đã xác thực nhưng profile chưa được tạo. Hãy kiểm tra migration và trigger tạo profile."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7">
            <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Hiện tại bạn chỉ có thể cập nhật họ và tên.
            </p>
            <div className="mt-6">
              <ProfileForm displayName={account.profile.display_name ?? ""} />
            </div>
          </section>
          <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-bold">Tài khoản</h2>
            <dl className="mt-5 space-y-5 text-sm">
              <div>
                <dt className="text-[var(--muted-foreground)]">Email</dt>
                <dd className="mt-1 font-semibold break-words">
                  {account.user.email}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">
                  Ngày tham gia
                </dt>
                <dd className="mt-1 font-semibold">
                  {dateFormatter.format(new Date(account.user.createdAt))}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">
                  Xác minh email
                </dt>
                <dd className="mt-1 font-semibold text-[var(--success)]">
                  {account.user.emailConfirmedAt
                    ? "Đã xác minh"
                    : "Chưa xác minh"}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}
