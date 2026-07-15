import {
  ArrowRight,
  BookCheck,
  BrainCircuit,
  CalendarRange,
  NotebookTabs,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Học IELTS có lộ trình",
  description:
    "Biết hôm nay cần học gì, hiểu vì sao sai và tiến bộ qua từng tuần.",
};

const learningLoop = [
  {
    title: "Chốt mục tiêu",
    description: "Xác định band đích, lịch thi và thời gian học thực tế.",
    icon: CalendarRange,
  },
  {
    title: "Học đúng việc",
    description: "Mỗi ngày nhận nhóm bài vừa với quỹ thời gian của bạn.",
    icon: BookCheck,
  },
  {
    title: "Hiểu từng lỗi",
    description: "Phản hồi gắn với câu trả lời, không chỉ đưa một con số.",
    icon: NotebookTabs,
  },
  {
    title: "Điều chỉnh kế hoạch",
    description: "Dữ liệu luyện tập giúp tuần sau tập trung đúng điểm yếu.",
    icon: BrainCircuit,
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--surface)]">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <MarketingHeader />
      <main id="main-content">
        <Container className="grid min-h-[calc(100dvh-4rem)] items-center gap-10 py-10 md:grid-cols-[0.9fr_1.1fr] md:py-14 lg:gap-16">
          <div className="max-w-xl">
            <p className="text-sm font-bold tracking-[0.16em] text-[var(--primary)] uppercase">
              Tự học IELTS có định hướng
            </p>
            <h1 className="mt-5 text-4xl leading-[1.05] font-bold tracking-[-0.05em] text-pretty text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              Biết rõ hôm nay cần học gì.
            </h1>
            <p className="mt-5 max-w-[52ch] text-base leading-7 text-pretty text-[var(--muted-foreground)] sm:text-lg">
              Lộ trình vừa sức, phản hồi cụ thể và tiến bộ nhìn thấy được.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">
                  Bắt đầu học
                  <ArrowRight aria-hidden="true" size={19} strokeWidth={1.8} />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/dashboard">Xem nền tảng</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-w-0">
            <div
              className="absolute -inset-3 rounded-[1.35rem] bg-[var(--primary-subtle)]"
              aria-hidden="true"
            />
            <Image
              src="/images/ielts-study-hero.png"
              alt="Một người học đang tập trung ghi chú bên máy tính"
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 767px) 100vw, 55vw"
              className="relative aspect-[3/2] w-full rounded-2xl object-cover shadow-[0_24px_70px_rgba(29,53,105,0.18)]"
            />
          </div>
        </Container>

        <section
          className="border-t border-[var(--border)] bg-[var(--background)] py-16 sm:py-20"
          aria-labelledby="learning-loop-title"
        >
          <Container>
            <h2
              id="learning-loop-title"
              className="max-w-xl text-3xl font-bold tracking-[-0.04em] text-pretty sm:text-4xl"
            >
              Một vòng học có đầu ra rõ ràng
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-pretty text-[var(--muted-foreground)]">
              Sản phẩm đang được xây theo từng lát cắt. Không có số liệu, lời
              chứng thực hay tính năng giả.
            </p>
            <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {learningLoop.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="border-t-2 border-[var(--primary-soft)] pt-5"
                  >
                    <Icon
                      aria-hidden="true"
                      className="text-[var(--primary)]"
                      size={24}
                      strokeWidth={1.8}
                    />
                    <h3 className="mt-4 font-bold text-[var(--foreground)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </Container>
        </section>
      </main>
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-8">
        <Container className="flex flex-col gap-3 text-sm text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
          <p>IELTS Flow. Nền tảng kỹ thuật Phase 1.</p>
          <Link
            className="font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
            href="/login"
          >
            Đăng nhập
          </Link>
        </Container>
      </footer>
    </div>
  );
}
