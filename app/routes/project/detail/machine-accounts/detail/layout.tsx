import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import {
  createMachineAccountService,
  useHydrateMachineAccount,
  useDeleteMachineAccount,
  useUpdateMachineAccount,
  type MachineAccount,
} from '@/resources/machine-accounts';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge, Button, NavItem, toast } from '@datum-ui/components';
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

  useHydrateMachineAccount(projectId ?? '', machineAccountId ?? '', account);

  const deleteMutation = useDeleteMachineAccount(projectId ?? '', {
    onSuccess: () => {
      toast.success('Machine account deleted');
      navigate(getPathWithParams(paths.project.detail.machineAccounts.root, { projectId }));
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

  const navItems: NavItem[] = useMemo(() => {
    const id = machineAccountId ?? account.name;
    return [
      {
        title: 'Overview',
        href: getPathWithParams(paths.project.detail.machineAccounts.detail.overview, {
          projectId,
          machineAccountId: id,
        }),
        type: 'link',
      },
      {
        title: 'Keys',
        href: getPathWithParams(paths.project.detail.machineAccounts.detail.keys, {
          projectId,
          machineAccountId: id,
        }),
        type: 'link',
      },
      {
        title: 'Policy Bindings',
        href: getPathWithParams(paths.project.detail.machineAccounts.detail.policyBindings, {
          projectId,
          machineAccountId: id,
        }),
        type: 'link',
      },
      {
        title: 'Activity',
        href: getPathWithParams(paths.project.detail.machineAccounts.detail.activity, {
          projectId,
          machineAccountId: id,
        }),
        type: 'link',
      },
    ];
  }, [projectId, machineAccountId, account.name]);

  return (
    <SubLayout
      sidebarHeader={
        <div className="flex flex-col gap-5.5">
          <BackButton
            className="hidden md:flex"
            to={getPathWithParams(paths.project.detail.machineAccounts.root, { projectId })}>
            Back to Machine Accounts
          </BackButton>
          <div className="flex flex-col gap-1">
            <span className="text-primary text-sm font-semibold">
              {account.displayName ?? account.name}
            </span>
            <span className="text-muted-foreground text-xs">{account.identityEmail}</span>
            <Badge
              type={account.status === 'Active' ? 'success' : 'secondary'}
              className="w-fit mt-1">
              {account.status}
            </Badge>
          </div>
          <div className="flex gap-2">
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
      }
      navItems={navItems}
      containerClassName="md:pl-5">
      <Outlet />
    </SubLayout>
  );
}
