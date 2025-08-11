import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateFormat } from '@/components/date-format/date-format';
import { MoreActions } from '@/components/more-actions/more-actions';
import { PageTitle } from '@/components/page-title/page-title';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { HttpProxyGeneralCard } from '@/features/edge/httpproxy/overview/general-card';
import { GrafanaTutorialCard } from '@/features/edge/httpproxy/overview/grafana-tutorial-card';
import { HttpProxyHostnamesCard } from '@/features/edge/httpproxy/overview/hostnames-card';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { ROUTE_PATH as HTTP_PROXIES_ACTIONS_PATH } from '@/routes/api/httpproxy';
import { getPathWithParams } from '@/utils/path';
import { formatDistanceToNow } from 'date-fns';
import { ClockIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useFetcher, useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export default function HttpProxyOverviewPage() {
  const httpProxy = useRouteLoaderData('httpproxy-detail');

  const fetcher = useFetcher({ key: 'delete-httpproxy' });
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();

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
        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}>
            <HttpProxyHostnamesCard
              customHostnames={httpProxy?.hostnames ?? []}
              status={httpProxy?.status}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}>
            <GrafanaTutorialCard projectId={projectId ?? ''} proxy={httpProxy ?? {}} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
