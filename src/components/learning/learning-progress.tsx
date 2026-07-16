import { cn } from "@/lib/utils";

export function LearningProgress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const normalized = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-[var(--muted-foreground)]">
          {label}
        </span>
        <span className="font-semibold text-[var(--foreground)] tabular-nums">
          {normalized}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalized}
        className="h-2 overflow-hidden rounded-full bg-[var(--muted)]"
      >
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-[width] motion-reduce:transition-none"
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}
