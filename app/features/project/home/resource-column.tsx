import { HOME_COLUMN_LIMIT } from './home.helpers';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ArrowRight, ChevronRight, Plus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Column bodies fit their content, from one row to HOME_COLUMN_LIMIT rows of
 * `h-10`, so a project with little in it doesn't leave a block of blank space
 * under the columns. Loading shows a single row, so loaded content only ever
 * grows the section downward.
 */
const COLUMN_BODY_CLASS = 'min-h-10 max-h-50';

/**
 * In a card the body is always five rows tall plus its padding, whatever it
 * holds: every card in the row is the same height while loading, when empty
 * and when full, so nothing below moves as the lists arrive.
 */
export const CARD_BODY_CLASS = 'h-53 max-h-none p-1.5';

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
 * full list, an optional count and action, and a fixed-height body. Plugin
 * columns render their own body inside it.
 *
 * With `card`, the heading and body sit inside one bordered card that fills
 * its grid cell, so neighbouring columns end at the same line whatever they
 * hold, and a "View all" footer links to the full list. Without it the frame
 * is a plain heading over its body, for content that brings its own card.
 */
export function ResourceColumnFrame({
  title,
  href,
  count,
  action,
  isLoading = false,
  testId,
  bodyClassName,
  card = false,
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
  /** Draw the column as a card that fills its grid cell. */
  card?: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  // A plugin column has no count, so it gets the footer whenever it has a list
  // page; that keeps every card in the row ending on the same footer line.
  const showFooter = card && !!href && !isLoading && (count === undefined || count > 0);

  return (
    <section
      className={cn(
        'flex min-w-0 flex-col',
        card ? 'bg-card h-full overflow-hidden rounded-xl border' : 'gap-2'
      )}
      data-testid={testId}
      aria-labelledby={headingId}
      aria-busy={isLoading}>
      <header
        className={cn(
          'flex shrink-0 items-center justify-between gap-2',
          card ? 'h-11 border-b pr-2 pl-4' : 'h-7'
        )}>
        <h2 id={headingId} className="flex min-w-0 items-center gap-2">
          {href ? (
            <Link
              to={href}
              className="text-foreground flex min-w-0 items-center gap-1 text-sm font-medium">
              <span className="truncate">{title}</span>
              {/* A card links to the full list from its footer instead. */}
              {!card && (
                <Icon
                  icon={ChevronRight}
                  size={14}
                  className="text-icon-quaternary shrink-0"
                  aria-hidden
                />
              )}
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
      <div className={cn(COLUMN_BODY_CLASS, card && CARD_BODY_CLASS, bodyClassName)}>
        {children}
      </div>
      {showFooter && (
        <Link
          to={href}
          className="text-muted-foreground hover:text-foreground hover:bg-accent/50 flex h-9 shrink-0 items-center justify-between border-t px-4 text-xs transition-colors">
          View all
          <Icon icon={ArrowRight} size={13} aria-hidden />
        </Link>
      )}
    </section>
  );
}

const SKELETON_LABEL_WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2'];

/**
 * Placeholder rows shown while a column loads. They are drawn at the same
 * height and padding as real rows so the swap to content is in place. A card
 * asks for a few rows, since its height is shared with its neighbours; a
 * plain column keeps one, so loaded content only grows it downward.
 */
export function ResourceColumnSkeleton({ label, rows = 1 }: { label: string; rows?: number }) {
  return (
    <div className="flex flex-col" role="status">
      <span className="sr-only">Loading {label.toLowerCase()}</span>
      {SKELETON_LABEL_WIDTHS.slice(0, rows).map((width) => (
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
  /** How many placeholder rows to show while loading. */
  skeletonRows?: number;
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
  skeletonRows,
}: ResourceColumnBodyProps) {
  if (isLoading) return <ResourceColumnSkeleton label={label} rows={skeletonRows} />;
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
      testId={testId}
      card>
      <ResourceColumnBody label={title} skeletonRows={3} {...body} />
    </ResourceColumnFrame>
  );
}

/**
 * Fills a column body when there is nothing to list: one row, the same height
 * and alignment as a real item, so an empty column lines up with its
 * neighbours and doesn't outweigh the ones that have content.
 */
export function ResourceColumnEmpty({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cn(COLUMN_ROW_CLASS, 'justify-between gap-3')}>
      <Text as="p" size="sm" textColor="muted" className="min-w-0 truncate">
        {children}
      </Text>
      {action}
    </div>
  );
}

/** Small "Add" button for a column header. */
/** Either a link to a create page, or a handler that opens a create dialog in place. */
type ColumnActionTarget = { href: string; onClick?: never } | { onClick: () => void; href?: never };

export function ResourceColumnAddAction({
  label,
  ...target
}: ColumnActionTarget & { label: string }) {
  const props = {
    type: 'quaternary',
    theme: 'borderless',
    size: 'xs',
    icon: <Icon icon={Plus} size={14} aria-hidden />,
    'aria-label': label,
  } as const;
  return target.onClick ? (
    <Button {...props} htmlType="button" onClick={target.onClick}>
      Add
    </Button>
  ) : (
    <LinkButton {...props} as={Link} href={target.href}>
      Add
    </LinkButton>
  );
}

/** The call to action beside an empty column's message. */
export function ResourceColumnEmptyAction({
  children,
  ...target
}: ColumnActionTarget & { children: ReactNode }) {
  const props = {
    type: 'secondary',
    theme: 'outline',
    size: 'xs',
    icon: <Icon icon={Plus} size={14} aria-hidden />,
  } as const;
  return target.onClick ? (
    <Button {...props} htmlType="button" onClick={target.onClick}>
      {children}
    </Button>
  ) : (
    <LinkButton {...props} as={Link} href={target.href}>
      {children}
    </LinkButton>
  );
}
