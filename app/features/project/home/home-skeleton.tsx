import { CARD_BODY_CLASS, COLUMN_ROW_CLASS } from './resource-column';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * Placeholders for the project home page. Each one is drawn at the size and
 * position of the thing it stands in for (the status strip, a resource card,
 * a next-step tile, a traffic tile), so content arrives in place and the page
 * doesn't jump. They are decorative: the wrapper that shows them carries the
 * `role="status"` and label.
 */

const ROW_WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2', 'w-1/3'];

/** The status strip: an icon, a line of text, and the VPC at the far end. */
export function StatusStripSkeleton() {
  return (
    <div className="bg-card flex h-10 items-center gap-3 rounded-xl border px-4" aria-hidden>
      <Skeleton className="size-4 shrink-0 rounded-full" />
      <Skeleton className="h-3 w-48 rounded" />
      <Skeleton className="ml-auto hidden h-3 w-40 rounded @xl/main:block" />
    </div>
  );
}

/** A resource card: its header, a few rows, and the "View all" footer. */
export function ResourceCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-card flex h-full flex-col overflow-hidden rounded-xl border" aria-hidden>
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
        <Skeleton className="h-3.5 w-20 rounded" />
        <Skeleton className="h-3.5 w-10 rounded" />
      </div>
      <div className={cn('flex flex-col', CARD_BODY_CLASS)}>
        {ROW_WIDTHS.slice(0, rows).map((width) => (
          <div key={width} className={COLUMN_ROW_CLASS}>
            <Skeleton className="size-3.5 shrink-0 rounded" />
            <div className="min-w-0 flex-1">
              <Skeleton className={cn('h-3 rounded', width)} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex h-9 shrink-0 items-center border-t px-4">
        <Skeleton className="h-3 w-12 rounded" />
      </div>
    </div>
  );
}

/** A section heading with its one-line description. */
export function SectionHeadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-1" aria-hidden>
      <Skeleton className="h-3.5 w-36 rounded" />
      <Skeleton className="h-3 w-56 rounded" />
    </div>
  );
}

/** A next-step tile: icon chip, two lines of text, a button. */
export function TileSkeleton() {
  return (
    <div className="bg-card flex items-center gap-3 rounded-xl border px-4 py-3" aria-hidden>
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-2/5 rounded" />
        <Skeleton className="h-3 w-3/5 rounded" />
      </div>
      <Skeleton className="h-7 w-24 shrink-0 rounded-md" />
    </div>
  );
}

/**
 * The home page body while the project's contents are still unknown: the
 * status strip, a row of resource cards and the next steps. It is the layout
 * most projects end up with, so a returning visitor sees the page take shape
 * rather than a blank block.
 */
export function HomeBodySkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading project">
      <StatusStripSkeleton />
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
          <ResourceCardSkeleton />
          <ResourceCardSkeleton />
          <div className="hidden @4xl/main:block">
            <ResourceCardSkeleton />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <SectionHeadingSkeleton />
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
            <TileSkeleton />
            <TileSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The page header while the project itself is loading: name, greeting, pill. */
export function HomeHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-6" aria-hidden>
      {/* The real header's sizes: a 30px title, a 4px gap, a 20px line. */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-[30px] w-64 rounded-md" />
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-80 max-w-full rounded" />
        </div>
      </div>
      <Skeleton className="hidden h-8 w-64 shrink-0 rounded-full @3xl/main:block" />
    </div>
  );
}
