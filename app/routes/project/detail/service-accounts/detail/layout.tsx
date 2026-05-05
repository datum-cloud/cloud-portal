import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import {
  createServiceAccountService,
  useServiceAccount,
  useServiceAccountWatch,
  type ServiceAccount,
} from '@/resources/service-accounts';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { toast } from '@datum-cloud/datum-ui/toast';
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

export type ServiceAccountDetailContext = {
  account: ServiceAccount;
  isDeleting: boolean;
  setIsDeleting: (value: boolean) => void;
};

export default function ServiceAccountDetailLayout() {
  const loaderAccount = useLoaderData<typeof loader>();
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

  const navItems: NavItem[] = useMemo(() => {
    const id = serviceAccountId ?? account.name;
    return [
      {
        title: 'Overview',
        href: getPathWithParams(paths.project.detail.serviceAccounts.detail.overview, {
          projectId,
          serviceAccountId: id,
        }),
        type: 'link',
      },
      {
        title: 'Keys',
        href: getPathWithParams(paths.project.detail.serviceAccounts.detail.keys, {
          projectId,
          serviceAccountId: id,
        }),
        type: 'link',
      },
      {
        title: 'Roles',
        href: getPathWithParams(paths.project.detail.serviceAccounts.detail.policyBindings, {
          projectId,
          serviceAccountId: id,
        }),
        type: 'link',
      },
      {
        title: 'Activity',
        href: getPathWithParams(paths.project.detail.serviceAccounts.detail.activity, {
          projectId,
          serviceAccountId: id,
        }),
        type: 'link',
      },
    ];
  }, [projectId, serviceAccountId, account.name]);

  const outletContext: ServiceAccountDetailContext = {
    account,
    isDeleting,
    setIsDeleting,
  };

  return (
    <SubLayout
      sidebarHeader={
        <div className="flex flex-col gap-5.5">
          <BackButton
            className="hidden md:flex"
            to={getPathWithParams(paths.project.detail.serviceAccounts.root, { projectId })}>
            Back to Service Accounts
          </BackButton>
          <span className="text-primary text-sm font-semibold">Manage Service Account</span>
        </div>
      }
      navItems={navItems}>
      <Outlet context={outletContext} />
    </SubLayout>
  );
}
