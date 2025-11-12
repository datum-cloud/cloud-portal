import { BackButton } from '@/components/back-button';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { MoreActions } from '@/components/more-actions/more-actions';
import { SubLayout } from '@/components/sub-layout';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { ROUTE_PATH as HTTP_PROXIES_ACTIONS_PATH } from '@/routes/api/httpproxy';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-ui/components';
import { NavItem } from '@datum-ui/components/sidebar';
import { ClockIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { Outlet, Link, useParams, useFetcher, useRouteLoaderData } from 'react-router';

export default function HttpProxyDetailLayout() {
  const httpProxy = useRouteLoaderData('httpproxy-detail');
  const { projectId } = useParams();

  const fetcher = useFetcher({ key: 'delete-httpproxy' });
  const { confirm } = useConfirmationDialog();

  const navItems: NavItem[] = [
    {
      title: 'Overview',
      href: getPathWithParams(paths.project.detail.httpProxy.detail.overview, {
        projectId,
        proxyId: httpProxy?.name ?? '',
      }),
      type: 'link',
    },
    {
      title: 'Metrics',
      href: getPathWithParams(paths.project.detail.httpProxy.detail.metrics, {
        projectId,
        proxyId: httpProxy?.name ?? '',
      }),
      type: 'link',
    },
  ];

  const deleteHttpProxy = async () => {
    await confirm({
      title: 'Delete HTTPProxy',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{httpProxy?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: httpProxy?.name ?? '',
            projectId: projectId ?? '',
            redirectUri: getPathWithParams(paths.project.detail.httpProxy.root, {
              projectId,
            }),
          },
          {
            action: HTTP_PROXIES_ACTIONS_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  return (
    <SubLayout
      navItems={navItems}
      sidebarHeader={
        <div className="flex flex-col gap-3.5">
          <BackButton
            to={getPathWithParams(paths.project.detail.httpProxy.root, {
              projectId,
            })}>
            Back to Proxy
          </BackButton>
          <span className="text-primary text-sm font-semibold">Manage Proxy</span>
        </div>
      }>
      {/* Header Section */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">
            {(httpProxy as IHttpProxyControlResponse)?.name ?? 'HTTPProxy'}
          </h1>
          <div className="flex items-center gap-1">
            <ClockIcon className="text-muted-foreground h-4 w-4" />
            <DateTime
              className="text-muted-foreground text-sm"
              date={(httpProxy as IHttpProxyControlResponse)?.createdAt ?? ''}
              variant="both"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="quaternary" theme="outline" size="small">
            <Link
              className="flex items-center gap-2"
              to={getPathWithParams(paths.project.detail.httpProxy.detail.edit, {
                projectId,
                proxyId: httpProxy?.name ?? '',
              })}>
              <PencilIcon className="size-4" />
              Edit
            </Link>
          </Button>
          <MoreActions
            className="border-input bg-background hover:bg-accent hover:text-accent-foreground size-9 rounded-md border px-3"
            actions={[
              {
                key: 'delete',
                label: 'Delete',
                variant: 'destructive',
                icon: <TrashIcon className="size-4" />,
                action: deleteHttpProxy,
              },
            ]}
          />
        </div>
      </div>

      {/* Content Area */}
      <Outlet />
    </SubLayout>
  );
}
