import { BadgeStatus } from '@/components/badge/badge-status';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import { ServiceAccountFormDialog } from '@/features/service-account/form/service-account-form-dialog';
import type { ServiceAccountFormDialogRef } from '@/features/service-account/form/service-account-form-dialog';
import {
  createServiceAccountService,
  useDeleteServiceAccount,
  useServiceAccounts,
  useServiceAccountsWatch,
  useToggleServiceAccount,
  type ServiceAccount,
} from '@/resources/service-accounts';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import {
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Service Accounts'));

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const service = createServiceAccountService();
  return service.list(projectId);
};

export default function ServiceAccountsPage() {
  const initialData = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();
  const formDialogRef = useRef<ServiceAccountFormDialogRef>(null);

  // Subscribe to live updates so the table reflects K8s state changes
  // (creates/deletes from elsewhere, status flips) without a page refresh.
  useServiceAccountsWatch(projectId ?? '');

  // When navigating back after a delete, the loader may return stale data that still
  // includes the deleted account. Filter it out so the UI is immediately consistent.
  const deletedName = (location.state as { deletedName?: string } | null)?.deletedName;
  const seededData = deletedName
    ? (initialData ?? []).filter((a) => a.name !== deletedName)
    : (initialData ?? []);

  const { data: queryData } = useServiceAccounts(projectId ?? '', {
    initialData: seededData,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const data = queryData ?? seededData;

  const deleteMutation = useDeleteServiceAccount(projectId ?? '', {
    onSuccess: () => {
      toast.success('Service account deleted', {
        description: 'The service account has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const toggleMutation = useToggleServiceAccount(projectId ?? '', {
    onSuccess: () => {
      toast.success('Service account updated');
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const deleteAccount = useCallback(
    async (account: ServiceAccount) => {
      await confirm({
        title: 'Delete Service Account',
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
        onSubmit: async () => {
          deleteMutation.mutate(account.name);
        },
      });
    },
    [confirm, deleteMutation]
  );

  const toggleAccount = useCallback(
    async (account: ServiceAccount) => {
      const newStatus = account.status === 'Active' ? 'Disabled' : 'Active';
      toggleMutation.mutate({ name: account.name, status: newStatus });
    },
    [toggleMutation]
  );

  const columns: ColumnDef<ServiceAccount>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'displayName',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            {/*<span className="font-medium">{row.original.displayName ?? row.original.name}</span>*/}
            <Tooltip message={row.original.name} hidden={!row.original.displayName}>
              <span className="font-medium" data-e2e="service-name">
                {row.original.displayName || row.original.name}
              </span>
            </Tooltip>
            <span className="text-muted-foreground text-xs">{row.original.identityEmail}</span>
          </div>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => (
          <BadgeStatus status={row.original.status} />
          // <Badge type={row.original.status === 'Active' ? 'success' : 'danger'} theme="light">
          //   {row.original.status}
          // </Badge>
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
      createActionsColumn<ServiceAccount>([
        {
          label: 'Edit',
          onClick: (row) => formDialogRef.current?.show(row),
        },
        {
          label: 'Disable',
          onClick: (row) => toggleAccount(row),
          hidden: (row: ServiceAccount) => row.status === 'Disabled',
        },
        {
          label: 'Enable',
          onClick: (row) => toggleAccount(row),
          hidden: (row: ServiceAccount) => row.status === 'Active',
        },
        {
          label: 'Delete',
          variant: 'destructive',
          onClick: (row) => deleteAccount(row),
        },
      ]),
    ],
    [projectId, deleteAccount, toggleAccount]
  );

  return (
    <>
      <Table.Client
        columns={columns}
        data={data}
        title="Service Accounts"
        description="Service accounts give non-human workloads a cryptographic identity to authenticate with Datum APIs — no shared passwords or long-lived tokens."
        search="Search"
        onRowClick={(row) =>
          navigate(
            getPathWithParams(paths.project.detail.serviceAccounts.detail.overview, {
              projectId,
              serviceAccountId: row.name,
            })
          )
        }
        actions={[
          <Link
            key="create"
            to={getPathWithParams(paths.project.detail.serviceAccounts.new, { projectId })}
            className="w-full sm:w-auto">
            <Button type="primary" theme="solid" size="small" className="w-full">
              <Icon icon={PlusIcon} className="size-4" />
              Create a Service Account
            </Button>
          </Link>,
        ]}
        empty="let's add a service account to get you started"
      />

      {/* Edit-only dialog — create flow lives at /service-accounts/new */}
      <ServiceAccountFormDialog ref={formDialogRef} projectId={projectId ?? ''} />
    </>
  );
}
