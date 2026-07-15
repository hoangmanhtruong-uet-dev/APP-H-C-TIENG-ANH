import { Badge } from "@/components/ui/badge";

type Status = "foundation" | "planned" | "ready" | "attention";

const statusCopy: Record<
  Status,
  { label: string; variant: "info" | "neutral" | "success" | "warning" }
> = {
  foundation: { label: "Nền tảng", variant: "info" },
  planned: { label: "Sắp triển khai", variant: "neutral" },
  ready: { label: "Sẵn sàng", variant: "success" },
  attention: { label: "Cần chú ý", variant: "warning" },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusCopy[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
