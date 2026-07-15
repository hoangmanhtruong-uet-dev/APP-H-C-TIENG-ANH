import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";

interface FoundationPageProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function FoundationPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
}: FoundationPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        action={<StatusBadge status="foundation" />}
      />
      <EmptyState title={emptyTitle} description={emptyDescription} />
    </div>
  );
}
