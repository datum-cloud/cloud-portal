import { type SubNavigationTab } from '@/components/sub-navigation';
import { ServiceAccountHeaderActions } from '@/features/service-account/service-account-header-actions';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import {
  createServiceAccountService,
  serviceAccountKeys,
  useServiceAccount,
  useServiceAccountWatch,
  type ServiceAccount,
} from '@/resources/service-accounts';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type LoaderFunctionArgs, Outlet, useNavigate, useParams } from 'react-router';

const route = defineResourceRoute<ServiceAccount>({
  type: 'detail',
  resource: 'serviceaccounts',
  paramName: 'serviceAccountId',
  notFoundLabel: 'Service Account',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this service account.",
  breadcrumb: ({ data }) => <span>{data?.displayName ?? data?.name ?? 'Service Account'}</span>,
  metaTitle: ({ data }) => data?.displayName ?? data?.name ?? 'Service Account',
  seedCache: ({ data, projectId, id }) => {
    const d = data as ServiceAccount;
    return [[serviceAccountKeys.detail(projectId, id), d]] as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<ServiceAccount, Record<string, never>>(args, {
    resource: 'serviceaccounts',
    group: 'iam.miloapis.com',
    scope: 'project',
    paramName: 'serviceAccountId',
    notFoundLabel: 'Service Account',
    fetch: ({ projectId, id }) => createServiceAccountService().get(projectId!, id),
  });

export const handle = route.handle;
export const meta = route.meta;

export type ServiceAccountDetailContext = {
  account: ServiceAccount;
  isDeleting: boolean;
  setIsDeleting: (value: boolean) => void;
};

export default route.Page(({ data: loaderAccount }) => {
  const { projectId, serviceAccountId } = useParams();
  const navigate = useNavigate();

  // Set during the delete -> navigate window so the cache + watch go quiet
  // and we don't trigger a 404 refetch against the just-deleted resource.
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: liveAccount } = useServiceAccount(projectId ?? '', serviceAccountId ?? '', {
    initialData: loaderAccount,
    initialDataUpdatedAt: Date.now(),
    enabled: !isDeleting,
  });

  useServiceAccountWatch(projectId ?? '', serviceAccountId ?? '', { enabled: !isDeleting });

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

  const navItems: SubNavigationTab[] = useMemo(() => {
    const id = serviceAccountId ?? account?.name ?? '';
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
      {
        label: 'Settings',
        href: getPathWithParams(paths.project.detail.serviceAccounts.detail.settings, {
          projectId,
          serviceAccountId: id,
        }),
      },
    ];
  }, [projectId, serviceAccountId, account?.name]);

  return (
    <SubLayout
      title={account?.displayName ?? account?.name}
      actions={
        account && (
          <ServiceAccountHeaderActions
            projectId={projectId ?? ''}
            serviceAccountId={serviceAccountId ?? ''}
            account={account}
          />
        )
      }
      navItems={navItems}>
      <Outlet
        context={{ account, isDeleting, setIsDeleting } satisfies ServiceAccountDetailContext}
      />
    </SubLayout>
  );
});
