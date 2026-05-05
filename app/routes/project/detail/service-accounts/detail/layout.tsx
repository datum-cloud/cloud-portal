import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { ProfileIdentity } from '@/components/profile-identity';
import { SubNavigationTabs, type SubNavigationTab } from '@/components/sub-navigation';
import {
  createServiceAccountService,
  useServiceAccount,
  useServiceAccountWatch,
  useDeleteServiceAccount,
  useUpdateServiceAccount,
  type ServiceAccount,
} from '@/resources/service-accounts';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { BotIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LoaderFunctionArgs,
  MetaFunction,
  Outlet,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: (data: ServiceAccount) => <span>{data?.displayName ?? data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const account = loaderData as ServiceAccount;
  return metaObject(account?.displayName ?? account?.name ?? 'Service Account');
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, serviceAccountId } = params;

  if (!projectId || !serviceAccountId) {
    throw new BadRequestError('Project ID and service account ID are required');
  }

  const service = createServiceAccountService();
  const account = await service.get(projectId, serviceAccountId);

  if (!account) {
    throw new NotFoundError('Service Account', serviceAccountId);
  }

  return account;
};

export default function ServiceAccountDetailLayout() {
  const loaderAccount = useLoaderData<typeof loader>();
  const { projectId, serviceAccountId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  // Set during the delete -> navigate window so the cache + watch go quiet
  // and we don't trigger a 404 refetch against the just-deleted resource.
  const [isDeleting, setIsDeleting] = useState(false);

  // Seed cache from SSR loader; consume the live value for the header below
  // so toggle/delete/external changes flow through the React Query cache.
  const { data: liveAccount } = useServiceAccount(projectId ?? '', serviceAccountId ?? '', {
    initialData: loaderAccount,
    initialDataUpdatedAt: Date.now(),
    enabled: !isDeleting,
  });

  // Subscribe to live updates from the K8s watch SSE so the header avatar/
  // email/status badge reflect external changes without a page refresh.
  useServiceAccountWatch(projectId ?? '', serviceAccountId ?? '', { enabled: !isDeleting });

  // Live cache wins; fall back to the SSR snapshot until the cache hydrates.
  const account = liveAccount ?? loaderAccount;

  // Detect external deletion: the watch's DELETED event evicts the cache,
  // turning a previously-defined liveAccount into undefined. When that
  // transition happens AND we're not in our own delete flow, the resource
  // is gone (deleted via CLI / another tab / terraform) — bail back to the
  // list with a toast so the page doesn't sit on stale loaderAccount data.
  const prevLiveRef = useRef(liveAccount);
  useEffect(() => {
    if (!isDeleting && prevLiveRef.current && !liveAccount) {
      toast.info('Service account', {
        description: 'No longer exists. Returning to the list.',
      });
      navigate(getPathWithParams(paths.project.detail.serviceAccounts.root, { projectId }));
      return;
    }
    prevLiveRef.current = liveAccount;
  }, [liveAccount, isDeleting, navigate, projectId]);

  const deleteMutation = useDeleteServiceAccount(projectId ?? '', {
    onMutate: () => {
      // Quiet the live query + watch so they don't refetch a 404 between
      // mutation success and the navigate-away below.
      setIsDeleting(true);
    },
    onSuccess: (_, name) => {
      toast.success('Service account deleted');
      navigate(getPathWithParams(paths.project.detail.serviceAccounts.root, { projectId }), {
        state: { deletedName: name },
      });
    },
    onError: (error) => {
      // Re-enable the live data path so the user can see status + retry.
      setIsDeleting(false);
      toast.error('Error', { description: error.message });
    },
  });

  const toggleMutation = useUpdateServiceAccount(projectId ?? '', serviceAccountId ?? '', {
    onSuccess: () => {
      toast.success('Service account updated');
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const handleDelete = async () => {
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
  };

  const handleToggle = () => {
    toggleMutation.mutate({
      status: account.status === 'Active' ? 'Disabled' : 'Active',
    });
  };

  const navItems: SubNavigationTab[] = useMemo(() => {
    const id = serviceAccountId ?? account.name;
    return [
      {
        label: 'Overview',
        href: getPathWithParams(paths.project.detail.serviceAccounts.detail.overview, {
          projectId,
          serviceAccountId: id,
        }),
      },
      {
        label: 'Keys',
        href: getPathWithParams(paths.project.detail.serviceAccounts.detail.keys, {
          projectId,
          serviceAccountId: id,
        }),
      },
      {
        label: 'Roles',
        href: getPathWithParams(paths.project.detail.serviceAccounts.detail.policyBindings, {
          projectId,
          serviceAccountId: id,
        }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.serviceAccounts.detail.activity, {
          projectId,
          serviceAccountId: id,
        }),
      },
    ];
  }, [projectId, serviceAccountId, account.name]);

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
