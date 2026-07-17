import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeader } from "@/components/layout/marketing-header";
import { Container } from "@/components/shared/container";
import { siteConfig } from "@/config/site";
import { PRIVACY_VERSION } from "@/features/auth/policies";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư",
  description:
    "Cách IELTS Flow thu thập, sử dụng, bảo vệ và xóa dữ liệu học tập.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--surface)]">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <MarketingHeader />
      <main id="main-content">
        <Container className="max-w-3xl py-12 sm:py-16">
          <p className="text-sm font-semibold text-[var(--primary)]">
            Phiên bản {PRIVACY_VERSION}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Chính sách quyền riêng tư
          </h1>
          <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
            IELTS Flow chỉ xử lý dữ liệu cần để cung cấp tài khoản, bài học,
            chấm bài và theo dõi tiến bộ. Dữ liệu của một học viên không được
            hiển thị cho học viên khác.
          </p>

          <div className="mt-10 space-y-9 text-[var(--foreground)] [&_h2]:text-xl [&_h2]:font-bold [&_li]:leading-7 [&_p]:leading-7 [&_p]:text-[var(--muted-foreground)] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
            <section>
              <h2>Dữ liệu được xử lý</h2>
              <ul>
                <li>Tài khoản, tên hiển thị, mục tiêu học và tiến độ.</li>
                <li>Câu trả lời, bài luận, kết quả luyện tập và mock test.</li>
                <li>
                  Audio Speaking riêng tư; transcript và feedback chỉ được tạo
                  khi bạn đồng ý rõ ràng.
                </li>
                <li>
                  Dữ liệu kỹ thuật tối thiểu cần cho xác thực, chống lạm dụng và
                  xử lý lỗi.
                </li>
              </ul>
            </section>
            <section>
              <h2>Lưu trữ và thời hạn</h2>
              <p className="mt-3">
                Audio Speaking được lưu trong bucket riêng tư và có hạn xóa 30
                ngày. Job máy chủ xóa object trước khi đánh dấu metadata đã xóa.
                Bài làm, transcript và feedback được giữ để hiển thị lịch sử học
                tập cho đến khi tài khoản hoặc dữ liệu liên quan được xóa theo
                yêu cầu hợp lệ.
              </p>
            </section>
            <section>
              <h2>Nhà cung cấp AI</h2>
              <p className="mt-3">
                Khi bạn chủ động đồng ý dùng feedback AI, nội dung bài luận hoặc
                audio cần thiết có thể được gửi từ máy chủ tới nhà cung cấp AI
                được cấu hình. Khóa API và service-role không bao giờ được gửi
                xuống trình duyệt. Nếu AI không được cấu hình hoặc lỗi, hệ thống
                không tạo transcript, đáp án hay feedback giả.
              </p>
            </section>
            <section>
              <h2>Quyền của bạn</h2>
              <p className="mt-3">
                Bạn có thể yêu cầu truy cập, sửa hoặc xóa dữ liệu bằng email tới{" "}
                <a
                  className="font-semibold text-[var(--primary)] underline"
                  href={`mailto:${siteConfig.supportEmail}`}
                >
                  {siteConfig.supportEmail}
                </a>
                . Đơn vị vận hành sẽ xác minh danh tính trước khi thực hiện và
                ghi lại kết quả xử lý.
              </p>
            </section>
          </div>

          <p className="mt-12 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted-foreground)]">
            Xem thêm{" "}
            <Link
              className="font-semibold text-[var(--primary)] underline"
              href="/terms"
            >
              Điều khoản sử dụng
            </Link>
            .
          </p>
        </Container>
      </main>
    </div>
  );
}
