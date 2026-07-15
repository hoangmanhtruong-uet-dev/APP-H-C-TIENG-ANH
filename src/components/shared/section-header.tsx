interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-[-0.025em] text-pretty text-[var(--foreground)] sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
