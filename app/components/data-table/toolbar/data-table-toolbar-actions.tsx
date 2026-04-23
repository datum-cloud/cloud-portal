import { DataTable, useDataTableSelection } from '@datum-cloud/datum-ui/data-table';
import { Button } from '@datum-ui/components/button/button';
import { cn } from '@shadcn/lib/utils';
import type { ReactNode } from 'react';

export interface MultiActionButton<TData> {
  key: string;
  label: string;
  icon?: ReactNode;
  /** Button type variant. Defaults to 'quaternary'. */
  type?: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'danger' | 'success' | 'warning';
  /** Button theme. Defaults to 'outline'. */
  theme?: 'solid' | 'outline' | 'light' | 'link' | 'borderless';
  /** Button size. Defaults to 'small'. */
  size?: 'default' | 'small' | 'xs' | 'large' | 'icon';
  disabled?: (rows: TData[]) => boolean;
  action: (rows: TData[]) => void;
  className?: string;
}

export interface MultiActionRender<TData> {
  key: string;
  render: (args: {
    selectedRows: TData[];
    selectedRowIds: string[];
    clearSelection: () => void;
  }) => ReactNode;
}

export type MultiAction<TData> = MultiActionButton<TData> | MultiActionRender<TData>;

function isButtonAction<TData>(a: MultiAction<TData>): a is MultiActionButton<TData> {
  return 'action' in a;
}

export interface DataTableToolbarActionsProps<TData> {
  actions: MultiAction<TData>[];
  className?: string;
}

export function DataTableToolbarActions<TData>({
  actions,
  className,
}: DataTableToolbarActionsProps<TData>) {
  const { selectedRows, rowSelection, setRowSelection } = useDataTableSelection<TData>();
  const selectedRowIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const clearSelection = () => setRowSelection({});

  return (
    <DataTable.BulkActions<TData>>
      {() => (
        <div className={cn('flex w-full items-center gap-2 sm:w-auto', className)}>
          {actions.map((action) => {
            if (isButtonAction(action)) {
              return (
                <Button
                  key={action.key}
                  type={action.type ?? 'quaternary'}
                  theme={action.theme ?? 'outline'}
                  size={action.size ?? 'small'}
                  disabled={action.disabled?.(selectedRows) ?? false}
                  onClick={() => action.action(selectedRows)}
                  icon={action.icon}
                  iconPosition="left"
                  className={cn('w-full sm:w-auto', action.className)}>
                  {action.label}
                </Button>
              );
            }
            return (
              <span key={action.key}>
                {action.render({ selectedRows, selectedRowIds, clearSelection })}
              </span>
            );
          })}
        </div>
      )}
    </DataTable.BulkActions>
  );
}
