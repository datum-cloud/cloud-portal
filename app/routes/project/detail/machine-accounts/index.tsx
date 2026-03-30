import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { MachineAccountFormDialog } from '@/features/machine-account/form/machine-account-form-dialog';
import type { MachineAccountFormDialogRef } from '@/features/machine-account/form/machine-account-form-dialog';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import type { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import {
  createMachineAccountService,
  useDeleteMachineAccount,
  useHydrateMachineAccounts,
  useMachineAccounts,
  useUpdateMachineAccount,
  type MachineAccount,
} from '@/resources/machine-accounts';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Badge, Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { LoaderFunctionArgs, MetaFunction, useLoaderData, useNavigate, useParams } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Machine Accounts'));

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const service = createMachineAccountService();
  return service.list(projectId);
};

export default function MachineAccountsPage() {
  const initialData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();
  const formDialogRef = useRef<MachineAccountFormDialogRef>(null);

  useHydrateMachineAccounts(projectId ?? '', initialData ?? []);

  const { data: queryData } = useMachineAccounts(projectId ?? '', {
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const data = queryData ?? initialData ?? [];

  const deleteMutation = useDeleteMachineAccount(projectId ?? '', {
    onSuccess: () => {
      toast.success('Machine account deleted', {
        description: 'The machine account has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const toggleMutation = useUpdateMachineAccount(projectId ?? '', '', {
    onSuccess: () => {
      toast.success('Machine account updated');
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const deleteAccount = useCallback(
    async (account: MachineAccount) => {
      await confirm({
        title: 'Delete Machine Account',
        description: (
          <span>
            Are you sure you want to delete <strong>{account.name}</strong>? This will revoke all
            associated keys.
          </span>
        ),
        submitText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: true,
        confirmValue: account.name,
        confirmInputLabel: `Type "${account.name}" to confirm.`,
        onSubmit: async () => {
          deleteMutation.mutate(account.name);
        },
      });
    },
    [confirm, deleteMutation]
  );

  const toggleAccount = useCallback(
    async (account: MachineAccount) => {
      const newStatus = account.status === 'Active' ? 'Disabled' : 'Active';
      toggleMutation.mutate({ status: newStatus });
    },
    [toggleMutation]
  );

  const columns: ColumnDef<MachineAccount>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{row.original.displayName ?? row.original.name}</span>
            <span className="text-muted-foreground text-xs">{row.original.identityEmail}</span>
          </div>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => (
          <Badge type={row.original.status === 'Active' ? 'success' : 'secondary'}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        header: 'Keys',
        accessorKey: 'keyCount',
        cell: ({ row }) => <span>{row.original.keyCount}</span>,
      },
      {
        header: 'Created',
        accessorKey: 'createdAt',
        cell: ({ row }) =>
          row.original.createdAt ? <DateTime date={row.original.createdAt} /> : null,
      },
    ],
    []
  );

  const rowActions: DataTableRowActionsProps<MachineAccount>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        variant: 'default',
        action: (row) => formDialogRef.current?.show(row),
      },
      {
        key: 'toggle',
        label: 'Disable / Enable',
        variant: 'default',
        action: (row) => toggleAccount(row),
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteAccount(row),
      },
    ],
    [deleteAccount, toggleAccount]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        emptyContent={{
          title: 'No machine accounts yet.',
          subtitle: 'Create one to enable secure automation and workload identity.',
          actions: [
            {
              type: 'button',
              label: 'Create Machine Account',
              onClick: () => formDialogRef.current?.show(),
              variant: 'default',
              icon: <Icon icon={PlusIcon} className="size-3" />,
              iconPosition: 'start',
            },
          ],
        }}
        tableTitle={{
          title: 'Machine Accounts',
          actions: (
            <Button
              type="primary"
              theme="solid"
              size="small"
              onClick={() => formDialogRef.current?.show()}>
              <Icon icon={PlusIcon} className="size-4" />
              Create Machine Account
            </Button>
          ),
        }}
        toolbar={{ layout: 'compact', includeSearch: { placeholder: 'Search machine accounts' } }}
        rowActions={rowActions}
        onRowClick={(row) =>
          navigate(
            getPathWithParams(paths.project.detail.machineAccounts.detail.overview, {
              projectId,
              machineAccountId: row.name,
            })
          )
        }
      />
      <MachineAccountFormDialog ref={formDialogRef} projectId={projectId ?? ''} />
    </>
  );
}
