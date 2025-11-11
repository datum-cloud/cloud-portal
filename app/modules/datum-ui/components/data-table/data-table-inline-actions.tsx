import { DataTableRowActionsProps } from './data-table.types';
import { Button } from '@datum-ui/components';
import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';

export const DataTableInlineActions = <TData,>({
  row,
  actions,
  disabled = false,
}: {
  row: TData;
  actions: DataTableRowActionsProps<TData>[];
  disabled?: boolean;
}) => {
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
        const tooltipText =
          typeof action.tooltip === 'function'
            ? action.tooltip(row)
            : (action.tooltip ?? action.label);

        const button = (
          <Button
            type={action.variant === 'destructive' ? 'danger' : 'quaternary'}
            theme={action.variant === 'destructive' ? 'solid' : 'outline'}
            size={showLabel ? 'small' : 'icon'}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!isActionDisabled) {
                action.action(row);
              }
            }}
            disabled={isActionDisabled}
            className={cn(
              'flex h-7 items-center justify-center px-2 focus-visible:ring-0 focus-visible:ring-offset-0',
              action.className
            )}>
            {action.icon}
            {showLabel && <span className="text-sm">{action.label}</span>}
          </Button>
        );

        // Wrap with tooltip if tooltip text exists
        if (tooltipText) {
          return (
            <div key={action.key} className="pointer-events-auto">
              <Tooltip message={tooltipText}>
                <span className="inline-block">{button}</span>
              </Tooltip>
            </div>
          );
        }

        return <div key={action.key}>{button}</div>;
      })}
    </div>
  );
};
