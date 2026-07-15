import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({
  title = "Không thể tải nội dung",
  description = "Hãy thử lại. Nếu lỗi vẫn tiếp diễn, mã theo dõi sẽ giúp chúng tôi kiểm tra.",
  action,
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-[var(--destructive-soft)] bg-[var(--destructive-subtle)] p-6"
    >
      <div className="flex items-start gap-4">
        <CircleAlert
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-[var(--destructive)]"
          size={22}
          strokeWidth={1.8}
        />
        <div className="min-w-0">
          <h2 className="font-bold text-[var(--foreground)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {description}
          </p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}
