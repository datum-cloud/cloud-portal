import { normalizeTooltip } from './data-table-column.types';
import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { TableHead, TableHeader, TableRow } from '@shadcn/ui/table';
import { Table as TTable, flexRender } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, ChevronUp, Info } from 'lucide-react';

export interface DataTableColumnHeaderProps<TData> {
  table: TTable<TData>;
  hasRowActions?: boolean;
}

export const DataTableColumnHeader = <TData,>({
  table,
  hasRowActions = false,
}: DataTableColumnHeaderProps<TData>) => {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className="hover:bg-transparent">
          {headerGroup.headers.map((header) => {
            // Get tooltip configuration from column meta
            const tooltipConfig = normalizeTooltip(header.column.columnDef.meta?.tooltip);
            const headerContent = flexRender(header.column.columnDef.header, header.getContext());
            const hasTooltip = tooltipConfig && !tooltipConfig.disabled;
            const isSortable = header.column.getCanSort();

            // Render header content with optional info icon
            const renderHeaderContent = () => (
              <span className="flex items-center gap-2">
                {headerContent}
                {hasTooltip && (
                  <Info className="text-muted-foreground/70 size-3.5 shrink-0" aria-hidden="true" />
                )}
              </span>
            );

            // Render sort icons for sortable columns
            const renderSortIcons = () =>
              header.column.getIsSorted() ? (
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
              );

            // Render complete column content
            const renderContent = () => {
              if (!isSortable) {
                return renderHeaderContent();
              }

              return (
                <div
                  className="flex h-full cursor-pointer items-center justify-between gap-1 select-none"
                  onClick={header.column.getToggleSortingHandler()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      header.column.getToggleSortingHandler()?.(e);
                    }
                  }}
                  tabIndex={0}>
                  {renderHeaderContent()}
                  {renderSortIcons()}
                </div>
              );
            };

            return (
              <TableHead
                key={header.id}
                className={cn(
                  'text-foreground h-8 border-r px-4 py-3 font-medium transition-all dark:bg-white/2 dark:hover:bg-white/5',
                  !hasRowActions && 'last:border-r-0',
                  isSortable && 'group hover:bg-table-accent',
                  header.column.columnDef.meta?.className
                )}>
                {header.isPlaceholder ? null : hasTooltip ? (
                  <Tooltip
                    message={tooltipConfig.content}
                    delayDuration={tooltipConfig.delayDuration}
                    side={tooltipConfig.side}
                    align={tooltipConfig.align}
                    sideOffset={10}>
                    {renderContent()}
                  </Tooltip>
                ) : (
                  renderContent()
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
