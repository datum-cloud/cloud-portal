import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { MachineAccountFormDialog } from '@/features/machine-account/form/machine-account-form-dialog';
import type { MachineAccountFormDialogRef } from '@/features/machine-account/form/machine-account-form-dialog';
import { CreateMachineAccountWizard } from '@/features/machine-account/wizard/create-machine-account-wizard';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import type { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import { cn } from '@/modules/shadcn/lib/utils';
import {
  createMachineAccountService,
  useDeleteMachineAccount,
  useHydrateMachineAccounts,
  useMachineAccounts,
  useToggleMachineAccount,
  type CreateMachineAccountKeyResponse,
  type MachineAccount,
} from '@/resources/machine-accounts';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ColumnDef } from '@tanstack/react-table';
import { GitBranchIcon, PlusIcon, ServerIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Machine Accounts'));

// ---------------------------------------------------------------------------
// Empty state landing page
// ---------------------------------------------------------------------------

interface UseCaseTileProps {
  icon: React.ElementType;
  title: string;
  description: string;
  bullets: string[];
  onClick: () => void;
}

function UseCaseTile({
  icon: IconComponent,
  title,
  description,
  bullets,
  onClick,
}: UseCaseTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-4 rounded-xl border p-6 text-left transition-colors',
        'border-border hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
      )}>
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <IconComponent className="text-primary size-5" aria-hidden="true" />
        </div>
        <span className="text-foreground text-sm font-semibold">{title}</span>
      </div>
      <p className="text-muted-foreground text-sm">{description}</p>
      <ul className="flex flex-col gap-1.5">
        {bullets.map((b) => (
          <li key={b} className="text-muted-foreground flex items-start gap-2 text-xs">
            <span className="text-primary mt-0.5 shrink-0">→</span>
            {b}
          </li>
        ))}
      </ul>
      <span className="text-primary text-xs font-medium">Get started →</span>
    </button>
  );
}

interface MachineAccountsEmptyStateProps {
  onSelectUseCase: () => void;
}

function MachineAccountsEmptyState({ onSelectUseCase }: MachineAccountsEmptyStateProps) {
  return (
    <div className="flex flex-col gap-8 py-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-lg font-semibold">Machine Accounts</h2>
        <p className="text-muted-foreground max-w-xl text-sm">
          Machine accounts give non-human workloads a cryptographic identity to authenticate with
          Datum APIs — no shared passwords or long-lived tokens.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UseCaseTile
          icon={GitBranchIcon}
          title="CI/CD Pipeline"
          description="Authenticate automated jobs in GitHub Actions, GitLab CI, Jenkins, or any other pipeline."
          bullets={[
            'Generates a credentials file you store as a CI secret',
            'Step-by-step setup instructions for GitHub Actions and GitLab CI',
            'Rotate keys without changing workflow files',
          ]}
          onClick={onSelectUseCase}
        />
        <UseCaseTile
          icon={ServerIcon}
          title="Service"
          description="Give a backend service or workload a stable identity to call Datum APIs without human credentials."
          bullets={[
            'Mount credentials as a Kubernetes secret or env vars',
            'Works with any language via JWT assertion exchange',
            'Disable or rotate keys without redeploying',
          ]}
          onClick={onSelectUseCase}
        />
      </div>
    </div>
  );
}

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
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();
  const formDialogRef = useRef<MachineAccountFormDialogRef>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // When navigating back after a delete, the loader may return stale data that still
  // includes the deleted account. Filter it out so the UI is immediately consistent.
  const deletedName = (location.state as { deletedName?: string } | null)?.deletedName;
  const seededData = deletedName
    ? (initialData ?? []).filter((a) => a.name !== deletedName)
    : (initialData ?? []);

  useHydrateMachineAccounts(projectId ?? '', seededData);

  const { data: queryData } = useMachineAccounts(projectId ?? '', {
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const data = queryData ?? seededData;

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

  const toggleMutation = useToggleMachineAccount(projectId ?? '', {
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
      toggleMutation.mutate({ name: account.name, status: newStatus });
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

  const navigateToAccount = (accountName: string, keyResponse?: CreateMachineAccountKeyResponse) =>
    navigate(
      getPathWithParams(paths.project.detail.machineAccounts.detail.keys, {
        projectId,
        machineAccountId: accountName,
      }),
      { state: keyResponse ? { keyResponse } : undefined }
    );

  const openWizard = () => setWizardOpen(true);

  return (
    <>
      {data.length === 0 ? (
        <MachineAccountsEmptyState onSelectUseCase={openWizard} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          tableTitle={{
            title: 'Machine Accounts',
            actions: (
              <Button type="primary" theme="solid" size="small" onClick={() => openWizard()}>
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
      )}

      {/* Edit-only dialog — create path uses the wizard below */}
      <MachineAccountFormDialog ref={formDialogRef} projectId={projectId ?? ''} />

      <CreateMachineAccountWizard
        projectId={projectId ?? ''}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onNavigateToAccount={navigateToAccount}
      />
    </>
  );
}
