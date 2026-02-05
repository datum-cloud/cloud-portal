import { useDataTable } from '../../core/data-table.context';
import { MultiAction, MultiActionButtonProps } from '../../core/data-table.types';
import { cn } from '@shadcn/lib/utils';
import { Button } from '@shadcn/ui/button';

export interface DataTableToolbarMultiActionsProps<TData> {
  /**
   * Array of multi-select actions to render
   * Can be button actions or custom render functions
   */
  actions: MultiAction<TData>[];

  /**
   * Custom className for the container
   */
  className?: string;
}

/**
 * Type guard to check if action is a button action (has 'action' property)
 */
function isButtonAction<TData>(
  action: MultiAction<TData>
): action is MultiActionButtonProps<TData> {
  return 'action' in action;
}

/**
 * DataTableToolbarMultiActions
 *
 * Renders bulk action buttons/components when rows are selected.
 * Automatically hides when no rows are selected.
 *
 * Supports two action types:
 * - Button actions: Standard button with label, icon, variant, and click handler
 * - Render actions: Custom render function for complex UI (e.g., popovers)
 *
 * @example
 * // Button actions
 * <DataTableToolbarMultiActions
 *   actions={[
 *     {
 *       key: 'delete',
 *       label: 'Delete',
 *       icon: <TrashIcon />,
 *       variant: 'destructive',
 *       action: (rows) => handleDelete(rows),
 *     },
 *     {
 *       key: 'export',
 *       label: 'Export',
 *       action: (rows) => handleExport(rows),
 *     },
 *   ]}
 * />
 *
 * @example
 * // Custom render action (e.g., popover)
 * <DataTableToolbarMultiActions
 *   actions={[
 *     {
 *       key: 'status',
 *       render: ({ selectedRows, clearSelection }) => (
 *         <StatusPopover rows={selectedRows} onComplete={clearSelection} />
 *       ),
 *     },
 *   ]}
 * />
 */
export function DataTableToolbarMultiActions<TData>({
  actions,
  className,
}: DataTableToolbarMultiActionsProps<TData>) {
  const { selectedRows, selectionCount, hasSelection, clearSelection, rowSelection } =
    useDataTable<TData>();

  // Don't render if no rows are selected
  if (!hasSelection) {
    return null;
  }

  // Get selected row IDs from rowSelection state
  const selectedRowIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Selection count indicator */}
      <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">
        {selectionCount} selected
      </span>

      {/* Render actions */}
      {actions.map((action) => {
        if (isButtonAction(action)) {
          // Button action
          const isDisabled = action.disabled?.(selectedRows) ?? false;

          return (
            <Button
              key={action.key}
              variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
              size="sm"
              disabled={isDisabled}
              onClick={() => action.action(selectedRows)}
              className="h-8">
              {action.icon && <span className="mr-1.5">{action.icon}</span>}
              {action.label}
            </Button>
          );
        }

        // Custom render action
        return (
          <span key={action.key}>
            {action.render({
              selectedRows,
              selectedRowIds,
              clearSelection,
            })}
          </span>
        );
      })}
    </div>
  );
}
