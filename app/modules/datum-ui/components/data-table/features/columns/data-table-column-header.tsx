import { normalizeTooltip } from './data-table-column.types';
import { Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { TableHead, TableHeader, TableRow } from '@shadcn/ui/table';
import { Table as TTable, flexRender } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

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
                  <Icon
                    icon={Info}
                    className="text-muted-foreground/70 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </span>
            );

            // Render sort icons for sortable columns
            const renderSortIcons = () => {
              const sortDirection = header.column.getIsSorted();

              return (
                <div className="flex flex-col">
                  <Icon
                    icon={ChevronUp}
                    size={10}
                    aria-hidden="true"
                    className={cn(
                      'text-foreground stroke -mb-0.5 stroke-2 opacity-25 transition-all',
                      sortDirection === 'asc' && 'opacity-100'
                    )}
                  />
                  <Icon
                    icon={ChevronDown}
                    size={10}
                    aria-hidden="true"
                    className={cn(
                      'text-foreground -mt-0.5 stroke-2 opacity-25 transition-all',
                      sortDirection === 'desc' && 'opacity-100'
                    )}
                  />
                </div>
              );
            };

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
                  'bg-background text-foreground h-[42px] border-r px-4 py-3 text-xs font-medium transition-all dark:bg-white/2 dark:hover:bg-white/5',
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
        </TableRow>
      ))}
    </TableHeader>
  );
};
