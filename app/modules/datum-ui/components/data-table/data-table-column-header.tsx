import { normalizeTooltip } from './data-table-column.types';
import { cn } from '@shadcn/lib/utils';
import { TableHead, TableHeader, TableRow } from '@shadcn/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/ui/tooltip';
import { Table as TTable, flexRender } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';

export interface DataTableColumnHeaderProps<TData> {
  table: TTable<TData>;
  hasRowActions?: boolean;
}

export const DataTableColumnHeader = <TData,>({
  table,
  hasRowActions = false,
}: DataTableColumnHeaderProps<TData>) => {
  // Helper function to wrap header text with tooltip (text-only)
  const renderHeaderWithTooltip = (
    headerContent: React.ReactNode,
    tooltip: ReturnType<typeof normalizeTooltip>
  ) => {
    if (!tooltip || tooltip.disabled) {
      return headerContent;
    }

    return (
      <Tooltip delayDuration={tooltip.delayDuration}>
        <TooltipTrigger asChild>
          <span>{headerContent}</span>
        </TooltipTrigger>
        <TooltipContent side={tooltip.side} align={tooltip.align}>
          {tooltip.content}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className="hover:bg-transparent">
          {headerGroup.headers.map((header) => {
            // Get tooltip configuration from column meta
            const tooltipConfig = normalizeTooltip(header.column.columnDef.meta?.tooltip);
            const headerContent = flexRender(header.column.columnDef.header, header.getContext());

            return (
              <TableHead
                key={header.id}
                className={cn(
                  'text-foreground h-8 border-r px-4 py-3 font-medium transition-all dark:bg-white/2 dark:hover:bg-white/5',
                  !hasRowActions && 'last:border-r-0',
                  header.column.getCanSort() && 'group hover:bg-table-accent',
                  header.column.columnDef.meta?.className
                )}>
                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                  <div
                    className={cn(
                      header.column.getCanSort() &&
                        'flex h-full cursor-pointer items-center justify-between gap-1 select-none'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={(e) => {
                      // Enhanced keyboard handling for sorting
                      if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        header.column.getToggleSortingHandler()?.(e);
                      }
                    }}
                    tabIndex={header.column.getCanSort() ? 0 : undefined}>
                    {/* Tooltip wraps only the header text, not the sort icons */}
                    {renderHeaderWithTooltip(headerContent, tooltipConfig)}
                    {header.column.getIsSorted() ? (
                      {
                        asc: <ChevronUp size={16} aria-hidden="true" />,
                        desc: <ChevronDown size={16} aria-hidden="true" />,
                      }[header.column.getIsSorted() as string]
                    ) : (
                      <ChevronsUpDown
                        className="text-foreground opacity-40 transition-opacity group-hover:opacity-100"
                        size={16}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                ) : (
                  // Non-sortable columns - wrap entire content with tooltip
                  renderHeaderWithTooltip(headerContent, tooltipConfig)
                )}
              </TableHead>
            );
          })}
          {hasRowActions && (
            <TableHead className="h-8 w-[50px] dark:bg-white/2 dark:hover:bg-white/5" />
          )}
        </TableRow>
      ))}
    </TableHeader>
  );
};
