import { DateFormat } from '@/components/common/date-format';
import { MoreAction } from '@/components/common/more-action';
import { PageTitle } from '@/components/layout/page-title';
import { Button } from '@/components/ui/button';
import { routes } from '@/constants/paths';
import { HttpProxyGeneralCard } from '@/features/edge/httpproxy/overview/general-card';
import { HttpProxyHostnamesCard } from '@/features/edge/httpproxy/overview/hostnames-card';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { ROUTE_PATH as HTTP_PROXIES_ACTIONS_PATH } from '@/routes/api+/edge+/httpproxy+/actions';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { formatDistanceToNow } from 'date-fns';
import { ClockIcon, PencilIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, MetaFunction, useParams, useRouteLoaderData, useSubmit } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find(
    (match) =>
      match.id ===
      'routes/_private+/$orgId+/projects.$projectId+/_edge+/httpproxy+/$proxyId+/_layout'
  ) as any;

  const httpProxy = match.data;
  return metaObject((httpProxy as IHttpProxyControlResponse)?.name || 'HTTPProxy');
});

export default function HttpProxyOverviewPage() {
  const httpProxy = useRouteLoaderData(
    'routes/_private+/$orgId+/projects.$projectId+/_edge+/httpproxy+/$proxyId+/_layout'
  );

  const submit = useSubmit();
  const { confirm } = useConfirmationDialog();
  const { orgId, projectId } = useParams();

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
        await submit(
          {
            id: httpProxy?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: HTTP_PROXIES_ACTIONS_PATH,
            method: 'DELETE',
            fetcherKey: 'http-proxy-resources',
            navigate: false,
          }
        );
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex w-full flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageTitle
          title={(httpProxy as IHttpProxyControlResponse)?.name ?? 'HTTPProxy'}
          description={
            <div className="flex items-center gap-1">
              <ClockIcon className="text-muted-foreground h-4 w-4" />
              <DateFormat
                className="text-muted-foreground text-sm"
                date={(httpProxy as IHttpProxyControlResponse)?.createdAt ?? ''}
              />
              <span className="text-muted-foreground text-sm">
                (
                {formatDistanceToNow(
                  new Date((httpProxy as IHttpProxyControlResponse)?.createdAt ?? ''),
                  {
                    addSuffix: true,
                  }
                )}
                )
              </span>
            </div>
          }
          actions={
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Link
                  className="flex items-center gap-2"
                  to={getPathWithParams(routes.projects.internetEdge.httpProxy.detail.edit, {
                    orgId,
                    projectId,
                    proxyId: httpProxy?.name ?? '',
                  })}>
                  <PencilIcon className="size-4" />
                  Edit
                </Link>
              </Button>
              <MoreAction
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground size-9 rounded-md border px-3"
                actions={[
                  {
                    key: 'delete',
                    label: 'Delete',
                    variant: 'destructive',
                    action: deleteHttpProxy,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}>
          <HttpProxyGeneralCard httpProxy={httpProxy} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}>
          <HttpProxyHostnamesCard hostnames={httpProxy?.status?.hostnames ?? []} />
        </motion.div>
      </div>
    </motion.div>
  );
}
