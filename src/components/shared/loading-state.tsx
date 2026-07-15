import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div
      className="space-y-6"
      aria-label="Đang tải nội dung"
      aria-live="polite"
    >
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/5" />
        <Skeleton className="h-5 w-3/5" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    </div>
  );
}
