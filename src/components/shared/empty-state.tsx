import { BookOpenText } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-12 text-center",
        className,
      )}
      aria-labelledby="empty-state-title"
    >
      <div className="mx-auto grid size-12 place-items-center rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)]">
        <BookOpenText aria-hidden="true" size={24} strokeWidth={1.8} />
      </div>
      <h2
        id="empty-state-title"
        className="mt-5 text-lg font-bold text-[var(--foreground)]"
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}
