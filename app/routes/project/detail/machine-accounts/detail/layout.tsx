import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { ProfileIdentity } from '@/components/profile-identity';
import { SubNavigationTabs, type SubNavigationTab } from '@/components/sub-navigation';
import {
  createMachineAccountService,
  useMachineAccount,
  useDeleteMachineAccount,
  useUpdateMachineAccount,
  type MachineAccount,
} from '@/resources/machine-accounts';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { BotIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  LoaderFunctionArgs,
  MetaFunction,
  Outlet,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: (data: MachineAccount) => <span>{data?.displayName ?? data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const account = loaderData as MachineAccount;
  return metaObject(account?.displayName ?? account?.name ?? 'Machine Account');
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, machineAccountId } = params;

  if (!projectId || !machineAccountId) {
    throw new BadRequestError('Project ID and machine account ID are required');
  }

  const service = createMachineAccountService();
  const account = await service.get(projectId, machineAccountId);

  if (!account) {
    throw new NotFoundError('Machine Account', machineAccountId);
  }

  return account;
};

export default function MachineAccountDetailLayout() {
  const account = useLoaderData<typeof loader>();
  const { projectId, machineAccountId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  // Seed cache synchronously with SSR data so child routes read it without skeleton flash
  useMachineAccount(projectId ?? '', machineAccountId ?? '', {
    initialData: account,
    initialDataUpdatedAt: Date.now(),
  });

  const deleteMutation = useDeleteMachineAccount(projectId ?? '', {
    onSuccess: (_, name) => {
      toast.success('Machine account deleted');
      navigate(getPathWithParams(paths.project.detail.machineAccounts.root, { projectId }), {
        state: { deletedName: name },
      });
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const toggleMutation = useUpdateMachineAccount(projectId ?? '', machineAccountId ?? '', {
    onSuccess: () => {
      toast.success('Machine account updated');
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const handleDelete = async () => {
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
  };

  const handleToggle = () => {
    toggleMutation.mutate({
      status: account.status === 'Active' ? 'Disabled' : 'Active',
    });
  };

  const navItems: SubNavigationTab[] = useMemo(() => {
    const id = machineAccountId ?? account.name;
    return [
      {
        label: 'Overview',
        href: getPathWithParams(paths.project.detail.machineAccounts.detail.overview, {
          projectId,
          machineAccountId: id,
        }),
      },
      {
        label: 'Keys',
        href: getPathWithParams(paths.project.detail.machineAccounts.detail.keys, {
          projectId,
          machineAccountId: id,
        }),
      },
      {
        label: 'Roles',
        href: getPathWithParams(paths.project.detail.machineAccounts.detail.policyBindings, {
          projectId,
          machineAccountId: id,
        }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.machineAccounts.detail.activity, {
          projectId,
          machineAccountId: id,
        }),
      },
    ];
  }, [projectId, machineAccountId, account.name]);

  const displayName = account.displayName ?? account.name;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <ProfileIdentity
            name={displayName}
            size="lg"
            avatarOnly
            fallbackIcon={BotIcon}
            fallbackClassName="bg-card text-muted-foreground"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-lg font-semibold">{displayName}</h1>
            <div className="text-muted-foreground flex items-center gap-3 text-sm">
              <span>
                {account.identityEmail || (
                  <span className="text-muted-foreground/50 italic">Provisioning...</span>
                )}
              </span>
              <span className="bg-border inline-block size-1 rounded-full" />

              <Badge
                type={account.status === 'Active' ? 'success' : 'secondary'}
                className="text-xs">
                {account.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            onClick={handleToggle}
            loading={toggleMutation.isPending}>
            {account.status === 'Active' ? 'Disable' : 'Enable'}
          </Button>
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            className="text-destructive border-destructive"
            onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <SubNavigationTabs tabs={navItems} />

      <div className="flex flex-1 flex-col pt-2">
        <Outlet />
      </div>
    </div>
  );
}
