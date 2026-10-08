import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import type { MultiAction } from '@/components/table';
import {
  type BulkDeletePlan,
  describeSkipped,
  planBulkDelete,
} from '@/features/edge/dns-records/utils';
import { useApp } from '@/providers/app.provider';
import {
  type IFlattenedDnsRecord,
  dnsRecordKeys,
  useBulkDeleteDnsRecords,
} from '@/resources/dns-records';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { createProjectMetadata, useTaskQueue } from '@datum-cloud/datum-ui/task-queue';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useQueryClient } from '@tanstack/react-query';
import { TrashIcon } from 'lucide-react';

interface UseBulkDeleteActionOptions {
  projectId: string;
  dnsZoneId: string;
  /** When false the action is omitted entirely, which also hides the row checkboxes. */
  enabled: boolean;
}

function recordsLabel(count: number): string {
  return count === 1 ? 'record' : 'records';
}

// Set by the DNS records route for records an ALB proxies. Records the ALB
// itself manages carry a different reason and can't be unprotected.
const ALB_PROTECTED_REASON = 'Protected by Application Load Balancer';

function skippedHint(plan: BulkDeletePlan): string {
  return plan.skipped.some((row) => row.lockReason === ALB_PROTECTED_REASON)
    ? 'Remove Application Load Balancer protection from a record to delete it.'
    : "They're managed for you and can't be deleted here.";
}

function BulkDeleteConfirmation({ plan }: { plan: BulkDeletePlan }) {
  return (
    <div className="flex flex-col gap-2">
      <span>
        Are you sure you want to delete <strong>{plan.total}</strong> {recordsLabel(plan.total)}?
      </span>
      <ul className="max-h-40 list-disc overflow-y-auto pl-5">
        {plan.groups.map((group) => (
          <li key={group.recordSetName}>
            <Text size="sm">{group.label}</Text>
          </li>
        ))}
      </ul>
      {plan.skipped.length > 0 && (
        <div className="flex flex-col gap-1">
          <Text size="sm" weight="medium">
            {plan.skipped.length} {recordsLabel(plan.skipped.length)} won&apos;t be deleted:
          </Text>
          <ul className="max-h-32 list-disc overflow-y-auto pl-5">
            {describeSkipped(plan.skipped).map(({ label, reason }, index) => (
              <li key={`${label}-${index}`}>
                <Text size="sm" textColor="muted">
                  {label}: {reason}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * "Delete selected" bulk action for the DNS records table.
 *
 * Groups the selection per RecordSet (the API writes whole sets), confirms
 * with the operator, then runs one task-queue item per set so different sets
 * delete in parallel while each set is written exactly once. Failures show
 * up in the task summary rather than as toasts. Returns the `multiActions`
 * array to hand to the table; empty when the action is not allowed.
 */
export function useBulkDeleteAction({
  projectId,
  dnsZoneId,
  enabled,
}: UseBulkDeleteActionOptions): MultiAction<IFlattenedDnsRecord>[] {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmationDialog();
  const { enqueue, showSummary } = useTaskQueue();
  const { project, organization } = useApp();
  const bulkDeleteMutation = useBulkDeleteDnsRecords(projectId, dnsZoneId);

  const runPlan = (plan: BulkDeletePlan) => {
    const metadata =
      project && organization
        ? createProjectMetadata(
            { id: project.name, name: project.displayName || project.name },
            { id: organization.name, name: organization.displayName || organization.name }
          )
        : undefined;
    const taskTitle = `Delete ${plan.total} DNS ${recordsLabel(plan.total)}`;

    enqueue({
      title: taskTitle,
      icon: <Icon icon={TrashIcon} className="size-4" />,
      items: plan.groups,
      metadata,
      // Groups target different RecordSets, so they never write the same object.
      itemConcurrency: 2,
      getItemId: (group) => group.recordSetName,
      processItem: async (group) => {
        await bulkDeleteMutation.mutateAsync({
          recordSetName: group.recordSetName,
          criteria: group.criteria,
        });
      },
      completionActions: (_result, { failed, items }) =>
        failed > 0
          ? [
              {
                children: 'Summary',
                type: 'quaternary' as const,
                theme: 'outline' as const,
                size: 'xs' as const,
                onClick: () =>
                  showSummary(
                    taskTitle,
                    items.map((item) => ({
                      id: item.id,
                      label: item.data?.label ?? item.id,
                      status: item.status === 'failed' ? 'failed' : 'success',
                      message: item.message,
                    }))
                  ),
              },
            ]
          : [],
      onComplete: () => {
        queryClient.invalidateQueries({ queryKey: dnsRecordKeys.list(projectId, dnsZoneId) });
        // The skipped records stay in the table, so say why once the task is
        // done; the confirmation alone was easy to miss (#1635).
        if (plan.skipped.length > 0) {
          toast.warning(`${plan.skipped.length} ${recordsLabel(plan.skipped.length)} skipped`, {
            description: skippedHint(plan),
          });
        }
      },
    });
  };

  const handleBulkDelete = async (rows: IFlattenedDnsRecord[], clearSelection: () => void) => {
    const plan = planBulkDelete(rows);
    if (plan.total === 0) {
      toast.warning('Nothing to delete', {
        description: 'Every selected record is managed by Datum or an Application Load Balancer.',
      });
      return;
    }

    await confirm({
      title: 'Delete DNS Records',
      description: <BulkDeleteConfirmation plan={plan} />,
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      onSubmit: async () => {
        runPlan(plan);
        clearSelection();
      },
    });
  };

  if (!enabled) return [];

  return [
    {
      label: 'Delete selected',
      icon: <Icon icon={TrashIcon} className="size-4" />,
      variant: 'destructive',
      onClick: (rows, { clearSelection }) => handleBulkDelete(rows, clearSelection),
    },
  ];
}
