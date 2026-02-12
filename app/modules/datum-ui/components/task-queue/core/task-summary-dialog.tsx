import { useTaskQueue } from '../hooks/use-task-queue';
import type { TaskSummaryItem } from '../types';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { Button } from '@datum-ui/components/button/button';
import { Dialog } from '@datum-ui/components/dialog';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { ReactNode, useMemo } from 'react';

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actions?: ReactNode;
};

type ItemsMode = BaseProps & {
  items: TaskSummaryItem[];
  taskId?: never;
  getItemLabel?: never;
};

type TaskIdMode = BaseProps & {
  taskId: string;
  getItemLabel: (id: string) => string;
  items?: never;
};

export type TaskSummaryDialogProps = ItemsMode | TaskIdMode;

// =============================================================================
// Status Config
// =============================================================================

const getStatusConfig = (status: TaskSummaryItem['status']) => {
  switch (status) {
    case 'success':
      return { icon: CheckCircle, label: 'Success', className: 'text-green-600' };
    case 'failed':
      return { icon: XCircle, label: 'Failed', className: 'text-destructive' };
  }
};

// =============================================================================
// Columns
// =============================================================================

const columns: ColumnDef<TaskSummaryItem>[] = [
  {
    header: 'Item',
    accessorKey: 'label',
    cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
  },
  {
    header: 'Status',
    id: 'status',
    accessorKey: 'status',
    meta: { className: 'max-w-80 break-all text-wrap whitespace-normal' },
    cell: ({ row }) => {
      const { status, message } = row.original;
      const config = getStatusConfig(status);
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Icon icon={config.icon} className={cn('size-4', config.className)} />
            <span className={cn('text-xs font-medium', config.className)}>{config.label}</span>
          </div>

          {message && status !== 'success' && (
            <span className="text-muted-foreground pl-5.5 text-xs text-wrap">{message}</span>
          )}
        </div>
      );
    },
  },
];

// =============================================================================
// Hook: Build items from task ID
// =============================================================================

function useTaskSummaryItems(
  taskId: string | undefined,
  getItemLabel: ((id: string) => string) | undefined
): TaskSummaryItem[] {
  const { tasks } = useTaskQueue();

  return useMemo(() => {
    if (!taskId || !getItemLabel) return [];

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return [];

    const succeeded: TaskSummaryItem[] = task.succeededItems.map((id) => ({
      id,
      label: getItemLabel(id),
      status: 'success',
    }));

    const failed: TaskSummaryItem[] = task.failedItems.map((item) => ({
      id: item.id ?? '',
      label: getItemLabel(item.id ?? ''),
      status: 'failed',
      message: item.message,
    }));

    return [...failed, ...succeeded];
  }, [taskId, getItemLabel, tasks]);
}

// =============================================================================
// Component
// =============================================================================

export function TaskSummaryDialog(props: TaskSummaryDialogProps) {
  const { open, onOpenChange, title, description, actions } = props;

  const taskIdItems = useTaskSummaryItems(
    'taskId' in props ? props.taskId : undefined,
    'getItemLabel' in props ? props.getItemLabel : undefined
  );

  const resolvedItems = useMemo(() => {
    const items = props.items ?? taskIdItems;
    // Sort failed items first
    return [...items].sort((a, b) => {
      if (a.status === 'failed' && b.status !== 'failed') return -1;
      if (a.status !== 'failed' && b.status === 'failed') return 1;
      return 0;
    });
  }, [props.items, taskIdItems]);

  const successCount = resolvedItems.filter((i) => i.status === 'success').length;
  const failedCount = resolvedItems.filter((i) => i.status === 'failed').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full sm:max-w-[774px]">
        <Dialog.Header
          title={title}
          description={description ?? `${successCount} succeeded, ${failedCount} failed`}
          onClose={() => onOpenChange(false)}
          className="border-b-0"
        />
        <Dialog.Body className="px-5 py-0">
          <DataTable
            className="rounded-xl"
            tableContainerClassName="rounded-xl max-h-[400px]"
            hidePagination
            columns={columns}
            data={resolvedItems}
            emptyContent={{ title: 'No items' }}
          />
        </Dialog.Body>
        <Dialog.Footer className="border-t-0">
          {actions}
          <Button type="primary" theme="solid" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
