import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  headingLevel?: 2 | 3 | 4;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  headingLevel = 3,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-card px-6 py-20 text-center shadow-[var(--shadow-card)]">
      {icon && (
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold-light/12 text-gold">
          {icon}
        </div>
      )}
      <Heading className="font-display text-2xl font-semibold tracking-[-0.025em] text-ivory">
        {title}
      </Heading>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          {description}
        </p>
      )}
      {actionLabel && actionHref && (
        <div className="mt-6">
          <Button href={actionHref} variant="outline" size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
