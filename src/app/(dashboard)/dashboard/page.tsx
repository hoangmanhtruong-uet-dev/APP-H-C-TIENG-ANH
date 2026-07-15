import { ArrowRight, CalendarClock, NotebookPen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Tổng quan",
  description: "Không gian tổng quan cho kế hoạch học IELTS.",
};

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Chào mừng đến không gian học"
        description="Phase 1 đang thiết lập nền móng. Dữ liệu kế hoạch và tiến độ chưa được tạo."
        action={<StatusBadge status="foundation" />}
      />

      <section
        className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]"
        aria-labelledby="today-title"
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7">
          <SectionHeader
            title="Học hôm nay"
            description="Task thật sẽ xuất hiện sau khi hoàn thành onboarding và plan generator ở Phase 2."
          />
          <EmptyState
            className="mt-6 border-0 bg-[var(--background)] py-8"
            title="Chưa có nhiệm vụ học"
            description="Không có dữ liệu mẫu được dùng để giả một kế hoạch đang hoạt động."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/roadmap">
                  Xem lộ trình
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
                </Link>
              </Button>
            }
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--foreground)] p-6 text-white sm:p-7">
          <CalendarClock
            aria-hidden="true"
            size={26}
            strokeWidth={1.7}
            className="text-[#aebfff]"
          />
          <h2 className="mt-5 text-xl font-bold">Tuần học đầu tiên</h2>
          <p className="mt-3 text-sm leading-6 text-[#ccd5e8]">
            Onboarding sẽ tạo lộ trình 4 tuần dựa trên mục tiêu và quỹ thời gian
            thật.
          </p>
          <div className="mt-7 border-t border-white/15 pt-5">
            <span className="text-sm font-semibold text-[#e6ebf5]">
              Dữ liệu chưa khởi tạo
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="foundation-title">
        <div className="flex items-center gap-3">
          <NotebookPen
            aria-hidden="true"
            className="text-[var(--primary)]"
            size={23}
            strokeWidth={1.8}
          />
          <h2
            id="foundation-title"
            className="text-xl font-bold tracking-[-0.025em]"
          >
            Foundation hiện có
          </h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="font-bold">Application shell</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Điều hướng desktop và mobile có active state, focus state và route
              riêng.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="font-bold">Trạng thái dùng chung</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Loading, empty, error và not-found được tách thành nền tảng tái sử
              dụng.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
