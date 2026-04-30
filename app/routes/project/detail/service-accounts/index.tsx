import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import { ServiceAccountFormDialog } from '@/features/service-account/form/service-account-form-dialog';
import type { ServiceAccountFormDialogRef } from '@/features/service-account/form/service-account-form-dialog';
import { CreateServiceAccountWizard } from '@/features/service-account/wizard/create-service-account-wizard';
import {
  createServiceAccountService,
  useDeleteServiceAccount,
  useServiceAccounts,
  useToggleServiceAccount,
  type CreateServiceAccountKeyResponse,
  type ServiceAccount,
} from '@/resources/service-accounts';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ColumnDef } from '@tanstack/react-table';
import { GitBranchIcon, PlusIcon, ServerIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
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
          <li
            key={b}
            className="text-muted-foreground flex items-center justify-start gap-2 text-xs">
            <span className="text-primary mb-0.5 shrink-0">→</span>
            {b}
          </li>
        ))}
      </ul>
      <span className="text-primary text-xs font-medium">Get started →</span>
    </button>
  );
}

interface ServiceAccountsEmptyStateProps {
  onSelectUseCase: () => void;
}

function ServiceAccountsEmptyState({ onSelectUseCase }: ServiceAccountsEmptyStateProps) {
  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title="Service Accounts"
        description="Service accounts give non-human workloads a cryptographic identity to authenticate with Datum APIs — no shared passwords or long-lived tokens."
      />
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
  const [wizardOpen, setWizardOpen] = useState(false);

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
        accessorKey: 'name',
        cell: ({ row }) => (
          <Link
            to={getPathWithParams(paths.project.detail.serviceAccounts.detail.overview, {
              projectId,
              serviceAccountId: row.original.name,
            })}
            className="flex flex-col gap-0.5 hover:underline">
            <span className="font-medium">{row.original.displayName ?? row.original.name}</span>
            <span className="text-muted-foreground text-xs">{row.original.identityEmail}</span>
          </Link>
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
      createActionsColumn<ServiceAccount>([
        {
          label: 'Edit',
          onClick: (row) => formDialogRef.current?.show(row),
        },
        {
          label: 'Disable / Enable',
          onClick: (row) => toggleAccount(row),
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

  const navigateToAccount = (accountName: string, keyResponse?: CreateServiceAccountKeyResponse) =>
    navigate(
      getPathWithParams(paths.project.detail.serviceAccounts.detail.keys, {
        projectId,
        serviceAccountId: accountName,
      }),
      { state: keyResponse ? { keyResponse } : undefined }
    );

  const openWizard = () => setWizardOpen(true);

  return (
    <>
      {data.length === 0 ? (
        <ServiceAccountsEmptyState onSelectUseCase={openWizard} />
      ) : (
        <Table.Client
          columns={columns}
          data={data}
          title="Service Accounts"
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
            <Button
              key="create"
              type="primary"
              theme="solid"
              size="small"
              onClick={() => openWizard()}>
              <Icon icon={PlusIcon} className="size-4" />
              Create Service Account
            </Button>,
          ]}
        />
      )}

      {/* Edit-only dialog — create path uses the wizard below */}
      <ServiceAccountFormDialog ref={formDialogRef} projectId={projectId ?? ''} />

      <CreateServiceAccountWizard
        projectId={projectId ?? ''}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onNavigateToAccount={navigateToAccount}
      />
    </>
  );
}
