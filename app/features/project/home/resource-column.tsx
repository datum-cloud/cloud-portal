import { HOME_COLUMN_LIMIT } from './home.helpers';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { ChevronRight } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';

export type ResourceColumnItem = {
  key: string;
  label: string;
  href: string;
  /** Shown before the label, e.g. a kind icon. */
  icon?: ReactNode;
  /** Shown after the label, e.g. a status badge. */
  meta?: ReactNode;
};

/**
 * The frame every project home column shares: a section with a heading that
 * links to the full list. Plugin columns render their own body inside it.
 */
export function ResourceColumnFrame({
  title,
  href,
  isLoading = false,
  testId,
  children,
}: {
  title: string;
  /** Full list page. Without it the heading is plain text. */
  href?: string;
  isLoading?: boolean;
  testId?: string;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section
      className="flex min-w-0 flex-col gap-2"
      data-testid={testId}
      aria-labelledby={headingId}
      aria-busy={isLoading}>
      <h2 id={headingId} className="flex h-6 items-center">
        {href ? (
          <Link
            to={href}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors">
            {title}
            <Icon icon={ChevronRight} size={12} aria-hidden />
          </Link>
        ) : (
          <Text as="span" size="xs" weight="medium" textColor="muted">
            {title}
          </Text>
        )}
      </h2>
      {children}
    </section>
  );
}

/** Placeholder rows shown while a column loads. */
export function ResourceColumnSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1" role="status">
      <span className="sr-only">Loading {label.toLowerCase()}</span>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}

/**
 * One host-rendered column of the project home page: up to a handful of
 * rows, and a slot shown when there are no rows.
 */
export function ResourceColumn({
  title,
  href,
  isLoading = false,
  items,
  emptyState,
  footer,
  testId,
}: {
  title: string;
  /** Full list page. Without it the heading is plain text. */
  href?: string;
  isLoading?: boolean;
  items: ResourceColumnItem[];
  emptyState: ReactNode;
  /** Shown under the rows, e.g. an "Add" link. */
  footer?: ReactNode;
  testId?: string;
}) {
  return (
    <ResourceColumnFrame title={title} href={href} isLoading={isLoading} testId={testId}>
      {isLoading ? (
        <ResourceColumnSkeleton label={title} />
      ) : items.length === 0 ? (
        emptyState
      ) : (
        <ul className="flex flex-col">
          {items.slice(0, HOME_COLUMN_LIMIT).map((item) => (
            <li key={item.key}>
              <Link
                to={item.href}
                className="hover:bg-accent group flex min-h-10 items-center gap-2 rounded-md px-2 py-1.5 transition-colors">
                {item.icon}
                <Text size="sm" ellipsis className="min-w-0 flex-1">
                  {item.label}
                </Text>
                {item.meta}
                <Icon
                  icon={ChevronRight}
                  size={14}
                  className="text-icon-quaternary group-hover:text-foreground shrink-0"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && footer}
    </ResourceColumnFrame>
  );
}

/** Dashed box used for a column with nothing to list yet. */
export function ResourceColumnEmpty({
  icon,
  children,
  action,
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="bg-muted/40 border-input flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center">
      {icon}
      <Text size="xs" textColor="muted">
        {children}
      </Text>
      {action}
    </div>
  );
}
