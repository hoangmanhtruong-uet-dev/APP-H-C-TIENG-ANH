import type { Metadata } from "next";
import Link from "next/link";

import { ModuleCatalog } from "@/components/learning/module-catalog";
import { PageHeader } from "@/components/shared/page-header";
import { getLearningCatalog } from "@/server/learning/content";

export const metadata: Metadata = {
  title: "Thư viện học",
  description: "Các module và bài học IELTS đã xuất bản.",
};

export default async function LearnPage() {
  const modules = await getLearningCatalog();
  const totalLessons = modules.reduce(
    (total, module) => total + module.totalLessons,
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Thư viện học"
        description={
          totalLessons > 0
            ? `${modules.length} module với ${totalLessons} bài học đã xuất bản và phù hợp với thiết lập IELTS của bạn.`
            : "Các module đã xuất bản và phù hợp với thiết lập IELTS của bạn sẽ xuất hiện tại đây."
        }
      />
      <section aria-labelledby="foundation-title">
        <h2 id="foundation-title" className="text-2xl font-bold">
          Vocabulary và Grammar
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/learn/vocabulary"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            <h3 className="text-lg font-bold">Vocabulary nền tảng</h3>
            <p className="mt-2 leading-7 text-[var(--muted-foreground)]">
              Từ học thuật, định nghĩa tiếng Việt, ví dụ nguyên bản và bài luyện
              có chấm điểm.
            </p>
          </Link>
          <Link
            href="/learn/grammar"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            <h3 className="text-lg font-bold">Grammar nền tảng</h3>
            <p className="mt-2 leading-7 text-[var(--muted-foreground)]">
              Quy tắc, ví dụ đúng, lỗi thường gặp và bài luyện deterministic.
            </p>
          </Link>
          <Link
            href="/practice/reading"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            <h3 className="text-lg font-bold">Reading practice</h3>
            <p className="mt-2 leading-7 text-[var(--muted-foreground)]">
              Passage nguyên bản, autosave, đồng hồ phía máy chủ và review sau
              khi nộp.
            </p>
          </Link>
        </div>
      </section>
      <ModuleCatalog modules={modules} />
    </div>
  );
}
