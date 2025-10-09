import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { MoreActions } from '@/components/more-actions/more-actions';
import { Button } from '@/components/ui/button';
import TabsLayout from '@/layouts/tabs/tabs';
import { TabsNavProps } from '@/layouts/tabs/tabs.types';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { ROUTE_PATH as HTTP_PROXIES_ACTIONS_PATH } from '@/routes/api/httpproxy';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { ClockIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { Outlet, Link, useParams, useFetcher, useRouteLoaderData } from 'react-router';

export default function HttpProxyDetailLayout() {
  const httpProxy = useRouteLoaderData('httpproxy-detail');
  const { projectId } = useParams();

  const fetcher = useFetcher({ key: 'delete-httpproxy' });
  const { confirm } = useConfirmationDialog();

  const navItems: TabsNavProps[] = [
    {
      value: 'overview',
      label: 'Overview',
      to: getPathWithParams(paths.project.detail.httpProxy.detail.overview, {
        projectId,
        proxyId: httpProxy?.name ?? '',
      }),
    },
    {
      value: 'metrics',
      label: 'Metrics',
      to: getPathWithParams(paths.project.detail.httpProxy.detail.metrics, {
        projectId,
        proxyId: httpProxy?.name ?? '',
      }),
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
    <TabsLayout
      containerClassName="max-w-6xl"
      tabsTitle={{
        title: (httpProxy as IHttpProxyControlResponse)?.name ?? 'HTTPProxy',
        description: (
          <div className="flex items-center gap-1">
            <ClockIcon className="text-muted-foreground h-4 w-4" />
            <DateTime
              className="text-muted-foreground text-sm"
              date={(httpProxy as IHttpProxyControlResponse)?.createdAt ?? ''}
              variant="both"
            />
          </div>
        ),
        actions: (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Link
                className="flex items-center gap-2"
                to={getPathWithParams(paths.project.detail.httpProxy.detail.edit, {
                  projectId,
                  proxyId: httpProxy?.name ?? '',
                })}>
                <PencilIcon />
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
                  icon: <TrashIcon />,
                  action: deleteHttpProxy,
                },
              ]}
            />
          </div>
        ),
      }}
      navItems={navItems}>
      <Outlet />
    </TabsLayout>
  );
}
