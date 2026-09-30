import { HOME_COLUMN_LIMIT } from './home.helpers';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronRight, Plus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Every column body is the same fixed height: room for HOME_COLUMN_LIMIT
 * rows of `h-10`. Skeletons, empty states and loaded rows all fill it, so
 * nothing on the page moves as columns load.
 */
const COLUMN_BODY_CLASS = 'h-50';

/** One row of a column body. Rows share this height so a full column fits exactly. */
export const COLUMN_ROW_CLASS = 'flex h-10 items-center gap-2 rounded-md px-2';

export type ResourceColumnItem = {
  key: string;
  label: string;
  href: string;
  /** Shown before the label, e.g. a kind icon. */
  icon?: ReactNode;
  /** Shown after the label, e.g. a status badge. */
  meta?: ReactNode;
};

/** A spare-row prompt under a short list, e.g. "Add a DNS zone for example.com". */
export type ResourceColumnSuggestion = {
  key: string;
  label: string;
  href: string;
};

/**
 * The frame every project home column shares: a heading that links to the
 * full list, an optional count and action, and a fixed-height body. Plugin columns render their own body inside it.
 */
export function ResourceColumnFrame({
  title,
  href,
  count,
  action,
  isLoading = false,
  testId,
  bodyClassName,
  children,
}: {
  title: string;
  /** Full list page. Without it the heading is plain text. */
  href?: string;
  /** Total number of resources, shown next to the heading once loaded. */
  count?: number;
  /** Shown at the right of the header, e.g. an "Add" button. */
  action?: ReactNode;
  isLoading?: boolean;
  testId?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section
      className="flex min-w-0 flex-col gap-2"
      data-testid={testId}
      aria-labelledby={headingId}
      aria-busy={isLoading}>
      <header className="flex h-7 shrink-0 items-center justify-between gap-2">
        <h2 id={headingId} className="flex min-w-0 items-center gap-2">
          {href ? (
            <Link
              to={href}
              className="text-foreground flex min-w-0 items-center gap-1 text-sm font-medium">
              <span className="truncate">{title}</span>
              <Icon
                icon={ChevronRight}
                size={14}
                className="text-icon-quaternary shrink-0"
                aria-hidden
              />
            </Link>
          ) : (
            <Text as="span" size="sm" weight="medium" className="truncate">
              {title}
            </Text>
          )}
          {!isLoading && count !== undefined && count > 0 && (
            <Text as="span" size="xs" textColor="muted" className="tabular-nums">
              {count}
            </Text>
          )}
        </h2>
        {action}
      </header>
      <div className={cn(COLUMN_BODY_CLASS, bodyClassName)}>{children}</div>
    </section>
  );
}

const SKELETON_LABEL_WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2'];

/**
 * Placeholder rows shown while a column loads. They are drawn at the same
 * height and padding as real rows so the swap to content is in place.
 */
export function ResourceColumnSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col" role="status">
      <span className="sr-only">Loading {label.toLowerCase()}</span>
      {SKELETON_LABEL_WIDTHS.map((width) => (
        <div key={width} className={COLUMN_ROW_CLASS} aria-hidden>
          <Skeleton className="size-3.5 shrink-0 rounded" />
          <div className="min-w-0 flex-1">
            <Skeleton className={cn('h-3 rounded', width)} />
          </div>
          <Skeleton className="h-4 w-12 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

type ResourceColumnBodyProps = {
  /** Names the loading state for screen readers. */
  label: string;
  isLoading?: boolean;
  items: ResourceColumnItem[];
  emptyState: ReactNode;
  suggestions?: ResourceColumnSuggestion[];
};

/**
 * A column body of linked rows: the loading skeleton, the empty state, or up
 * to HOME_COLUMN_LIMIT rows. Short lists can fill their spare rows with
 * `suggestions`, e.g. "Add a DNS zone for …".
 */
export function ResourceColumnBody({
  label,
  isLoading = false,
  items,
  emptyState,
  suggestions = [],
}: ResourceColumnBodyProps) {
  if (isLoading) return <ResourceColumnSkeleton label={label} />;
  if (items.length === 0) return emptyState;

  const rows = items.slice(0, HOME_COLUMN_LIMIT);
  const spare = suggestions.slice(0, HOME_COLUMN_LIMIT - rows.length);

  return (
    <ul className="flex flex-col">
      {rows.map((item) => (
        <li key={item.key}>
          <Link
            to={item.href}
            className={cn(COLUMN_ROW_CLASS, 'hover:bg-accent transition-colors')}>
            {item.icon}
            <Text size="sm" ellipsis className="min-w-0 flex-1">
              {item.label}
            </Text>
            {item.meta}
          </Link>
        </li>
      ))}
      {spare.map((suggestion) => (
        <li key={suggestion.key}>
          <Link
            to={suggestion.href}
            className={cn(
              COLUMN_ROW_CLASS,
              'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors'
            )}>
            <Icon icon={Plus} size={14} className="shrink-0" aria-hidden />
            <Text size="sm" ellipsis className="min-w-0 flex-1 text-inherit">
              {suggestion.label}
            </Text>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One host-rendered column of the project home page: the shared frame around linked rows. */
export function ResourceColumn({
  title,
  href,
  count,
  action,
  testId,
  ...body
}: Omit<ResourceColumnBodyProps, 'label'> & {
  title: string;
  /** Full list page. Without it the heading is plain text. */
  href?: string;
  count?: number;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <ResourceColumnFrame
      title={title}
      href={href}
      count={count}
      action={action}
      isLoading={body.isLoading}
      testId={testId}>
      <ResourceColumnBody label={title} {...body} />
    </ResourceColumnFrame>
  );
}

/** Fills a column body when there is nothing to list: what goes here, and how to start. */
export function ResourceColumnEmpty({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      {icon && (
        <div className="bg-muted border-border text-icon-secondary flex size-9 items-center justify-center rounded-lg border">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {title && (
          <Text as="p" size="sm" weight="medium">
            {title}
          </Text>
        )}
        <Text as="p" size="xs" textColor="muted" className="text-balance">
          {children}
        </Text>
      </div>
      {action}
    </div>
  );
}

/** Small "Add" button for a column header. */
export function ResourceColumnAddAction({ href, label }: { href: string; label: string }) {
  return (
    <LinkButton
      as={Link}
      href={href}
      type="quaternary"
      theme="borderless"
      size="xs"
      icon={<Icon icon={Plus} size={14} aria-hidden />}
      aria-label={label}>
      Add
    </LinkButton>
  );
}

/** The primary call to action inside an empty column. */
export function ResourceColumnEmptyAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <LinkButton
      as={Link}
      href={href}
      type="primary"
      theme="solid"
      size="xs"
      icon={<Icon icon={Plus} size={14} aria-hidden />}>
      {children}
    </LinkButton>
  );
}
