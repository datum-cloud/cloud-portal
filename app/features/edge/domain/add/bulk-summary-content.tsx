import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import type { TaskSummaryItem } from '@datum-cloud/datum-ui/task-queue';
import { Text } from '@datum-cloud/datum-ui/typography';
import { CircleCheck, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  success: { icon: CircleCheck, label: 'Success', className: 'text-green-600' },
  failed: { icon: XCircle, label: 'Failed', className: 'text-destructive' },
} as const;

const failedFirst = (a: TaskSummaryItem, b: TaskSummaryItem) =>
  Number(b.status === 'failed') - Number(a.status === 'failed');

/** The default summary table, but messages also show on succeeded rows (the default hides them). */
export const renderBulkSummaryContent = (items: TaskSummaryItem[]) => (
  <div className="max-h-[400px] overflow-auto rounded-xl border">
    <Table>
      <TableHeader className="bg-muted/50 sticky top-0">
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="max-w-80">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...items].sort(failedFirst).map((item) => {
          const { icon, label, className } = STATUS_CONFIG[item.status];
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.label}</TableCell>
              <TableCell className="max-w-80 text-wrap break-all whitespace-normal">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon icon={icon} className={`size-4 ${className}`} />
                    <Text as="span" size="xs" weight="medium" className={className}>
                      {label}
                    </Text>
                  </div>
                  {item.message && (
                    <Text as="span" size="xs" textColor="muted" className="pl-5.5 text-wrap">
                      {item.message}
                    </Text>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);
