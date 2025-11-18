import { useDataTable } from '../../core/data-table.context';
import { DataTableRowActionsProps } from '../../core/data-table.types';
import { Button } from '@datum-ui/components';
import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';

export const DataTableInlineActions = <TData,>({
  row,
  rowId,
  actions,
  disabled = false,
}: {
  row: TData;
  rowId?: string;
  actions: DataTableRowActionsProps<TData>[];
  disabled?: boolean;
}) => {
  const { openInlineContent } = useDataTable<TData>();
  // Filter visible actions
  const visibleActions = actions.filter((action) => !action.hidden?.(row));

  // Hide if no visible actions remain
  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {visibleActions.map((action) => {
        const isActionDisabled = disabled || action.disabled?.(row) || false;
        const showLabel = action.showLabel ?? true;

        // Generate tooltip text from action config or fallback to label

        const handleClick = (event: React.MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();

          if (isActionDisabled) return;

          // If this action triggers inline edit, open the form
          if (action.triggerInlineEdit && rowId) {
            openInlineContent('edit', row, rowId);
          }

          // Still call the action callback (for optional pre-edit logic)
          action.action(row);
        };

        const button = (
          <Button
            type={action.variant === 'destructive' ? 'danger' : 'quaternary'}
            theme={action.variant === 'destructive' ? 'solid' : 'outline'}
            size={showLabel ? 'small' : 'icon'}
            onClick={handleClick}
            disabled={isActionDisabled}
            className={cn('h-7 px-2', action.className)}>
            {action.icon}
            {showLabel && <span className="text-xs">{action.label}</span>}
          </Button>
        );

        // Wrap with tooltip if tooltip text exists
        if (action.tooltip) {
          const tooltipText =
            typeof action.tooltip === 'function'
              ? action.tooltip(row)
              : (action.tooltip ?? action.label);

          if (tooltipText) {
            return (
              <div key={action.key} className="pointer-events-auto">
                <Tooltip message={tooltipText}>
                  <span className="inline-block">{button}</span>
                </Tooltip>
              </div>
            );
          }
        }

        return <div key={action.key}>{button}</div>;
      })}
    </div>
  );
};
