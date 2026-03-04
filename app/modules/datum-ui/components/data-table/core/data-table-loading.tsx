import { SpinnerIcon, Skeleton } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcn/ui/table';

const DEFAULT_TABLE_SKELETON_ROWS = 10;
const DEFAULT_CARD_SKELETON_COUNT = 5;

export interface DataTableLoadingTableSkeletonProps {
  /** Number of columns (e.g. from table.getVisibleLeafColumns().length) */
  columnCount: number;
  /** Number of skeleton rows to show */
  rowCount?: number;
  /** Whether to render the header row */
  showHeader?: boolean;
  /** Optional class for the table container */
  className?: string;
}

/**
 * Skeleton loading state for table layout.
 * Renders a table with skeleton header and body rows. Header row is styled to read as a header.
 */
export function DataTableLoadingTableSkeleton({
  columnCount,
  rowCount = DEFAULT_TABLE_SKELETON_ROWS,
  showHeader = true,
  className,
}: DataTableLoadingTableSkeletonProps) {
  return (
    <Table className={className}>
      {showHeader && (
        <TableHeader>
          <TableRow className="bg-muted/30 border-b hover:bg-transparent">
            {Array.from({ length: columnCount }).map((_, i) => (
              <TableHead key={i} className="text-muted-foreground h-[42px] px-4 py-3 font-medium">
                <Skeleton className="bg-muted-foreground/20 h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      )}
      <TableBody>
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="border-b hover:bg-transparent">
            {Array.from({ length: columnCount }).map((_, colIndex) => (
              <TableCell key={colIndex} className="px-4 py-3">
                <Skeleton
                  className={cn(
                    'h-6',
                    // Vary width slightly per column for a more natural look
                    colIndex === 0
                      ? 'w-32'
                      : colIndex === columnCount - 1
                        ? 'w-16'
                        : 'w-full max-w-48'
                  )}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export interface DataTableLoadingCardSkeletonProps {
  /** Number of skeleton cards to show */
  cardCount?: number;
  /**
   * When true (default), each card shows the common layout: icon + title on the left,
   * slug-style badge + status badge on the right. When false, shows generic lines.
   */
  useCardLayout?: boolean;
  /** Number of skeleton lines per card (only when useCardLayout is false) */
  linesPerCard?: number;
  /** Optional class for the table container */
  className?: string;
}

/**
 * Skeleton loading state for card layout.
 * Renders skeleton cards that match the structure of DataTableCardView:
 * left section (icon + title), right section (identifier badge + type/status badge).
 */
export function DataTableLoadingCardSkeleton({
  cardCount = DEFAULT_CARD_SKELETON_COUNT,
  useCardLayout = true,
  linesPerCard = 3,
  className,
}: DataTableLoadingCardSkeletonProps) {
  return (
    <Table className={className}>
      <TableBody>
        {Array.from({ length: cardCount }).map((_, cardIndex) => (
          <TableRow key={cardIndex} className="relative border-none hover:bg-transparent">
            <TableCell className="p-0 pb-4">
              <div className="bg-card flex h-[80px] items-center rounded-lg border shadow-none">
                <div className="w-full p-[24px]">
                  {useCardLayout ? (
                    <div className="flex w-full flex-col items-start justify-start gap-4 md:flex-row md:items-center md:justify-between md:gap-2">
                      <div className="flex items-center gap-5">
                        <Skeleton className="size-4 shrink-0 rounded-md" />
                        <Skeleton className="h-5 w-48 max-w-full rounded-md" />
                      </div>
                      <div className="flex w-full items-center justify-between gap-6 md:w-auto">
                        <Skeleton className="h-6 w-36 rounded-md" />
                        <Skeleton className="h-6 w-20 shrink-0 rounded-md" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Array.from({ length: linesPerCard }).map((_, lineIndex) => (
                        <Skeleton
                          key={lineIndex}
                          className={cn(
                            'h-6 rounded-md',
                            lineIndex === 0
                              ? 'w-3/4'
                              : lineIndex === linesPerCard - 1
                                ? 'w-1/2'
                                : 'w-full'
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** @deprecated Use DataTableLoadingTableSkeleton or DataTableLoadingCardSkeleton for layout-specific skeletons. */
export const DataTableLoadingContent = ({ title = 'Loading...' }: { title?: string }) => {
  return (
    <div className="flex h-[226px] flex-col items-center justify-center gap-3.5 px-6 py-7">
      <SpinnerIcon size="lg" />
      <span className="text-xs font-medium">{title}</span>
    </div>
  );
};
