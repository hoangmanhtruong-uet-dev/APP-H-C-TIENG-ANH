import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl items-center px-4 py-16 sm:px-6">
      <EmptyState
        className="w-full"
        title="Không tìm thấy trang"
        description="Đường dẫn này không tồn tại hoặc chưa thuộc phạm vi hiện tại."
        action={
          <Button asChild>
            <Link href="/">Về trang chủ</Link>
          </Button>
        }
      />
    </main>
  );
}
