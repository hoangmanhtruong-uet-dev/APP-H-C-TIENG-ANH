import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral:
          "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
        info: "border-[var(--primary-soft)] bg-[var(--primary-subtle)] text-[var(--primary)]",
        success:
          "border-[var(--success-soft)] bg-[var(--success-subtle)] text-[var(--success)]",
        warning:
          "border-[var(--warning-soft)] bg-[var(--warning-subtle)] text-[var(--warning)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
