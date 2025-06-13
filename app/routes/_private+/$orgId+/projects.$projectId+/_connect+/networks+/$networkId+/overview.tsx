import { DateFormat } from '@/components/date-format/date-format';
import { MoreActions } from '@/components/more-actions/more-actions';
import { PageTitle } from '@/components/page-title/page-title';
import { Button } from '@/components/ui/button';
import { routes } from '@/constants/routes';
import { NetworkGeneralCard } from '@/features/network/overview/general-card';
import { NetworkBindingsTable } from '@/features/network/overview/network-bindings';
import { NetworkContextsTable } from '@/features/network/overview/network-contexts';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { createNetworkBindingsControl } from '@/resources/control-plane/network-bindings.control';
import { createNetworkContextControl } from '@/resources/control-plane/network-context.control';
import { INetworkControlResponse } from '@/resources/interfaces/network.interface';
import { ROUTE_PATH as NETWORKS_ACTIONS_ROUTE_PATH } from '@/routes/api+/connect+/networks+/actions';
import { CustomError } from '@/utils/errorHandle';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { ClockIcon, PencilIcon } from 'lucide-react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useLoaderData,
  useParams,
  useRouteLoaderData,
  useSubmit,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find(
    (match) =>
      match.id ===
      'routes/_private+/$orgId+/projects.$projectId+/_connect+/networks+/$networkId+/_layout'
  ) as any;

  const network = match.data;
  return metaObject((network as INetworkControlResponse)?.name || 'Network');
});

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { networkId, projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !networkId) {
    throw new CustomError('Project ID and network ID are required', 400);
  }

  // Get network bindings
  const bindingsControl = createNetworkBindingsControl(controlPlaneClient as Client);
  const networkBindings = await bindingsControl.list(projectId, networkId);

  // Get network contexts
  const contextControl = createNetworkContextControl(controlPlaneClient as Client);
  const networkContexts = await contextControl.list(projectId, networkId);

  return data({ bindings: networkBindings, contexts: networkContexts });
};

export default function NetworkOverviewPage() {
  const network = useRouteLoaderData(
    'routes/_private+/$orgId+/projects.$projectId+/_connect+/networks+/$networkId+/_layout'
  );
  const { bindings, contexts } = useLoaderData<typeof loader>();

  const submit = useSubmit();
  const { confirm } = useConfirmationDialog();
  const { orgId, projectId, networkId } = useParams();

  // revalidate every 10 seconds to keep deployment list fresh
  const revalidator = useRevalidateOnInterval({ enabled: true, interval: 10000 });

  const deleteNetwork = async () => {
    const data = network as INetworkControlResponse;
    await confirm({
      title: 'Delete Network',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{data?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${data?.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the workload name to confirm deletion',
      confirmValue: data?.name ?? 'delete',
      onSubmit: async () => {
        // Clear the interval when deleting a workload
        revalidator.clear();

        await submit(
          {
            networkId: data?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: NETWORKS_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
            fetcherKey: 'network-resources',
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
      className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}>
        <PageTitle
          title={(network as INetworkControlResponse)?.name ?? 'Network'}
          description={
            <div className="flex items-center gap-1">
              <ClockIcon className="text-muted-foreground h-4 w-4" />
              <DateFormat
                className="text-muted-foreground text-sm"
                date={(network as INetworkControlResponse)?.createdAt ?? ''}
              />
              <span className="text-muted-foreground text-sm">
                (
                {formatDistanceToNow(
                  new Date((network as INetworkControlResponse)?.createdAt ?? ''),
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
                  to={getPathWithParams(routes.projects.connect.networks.detail.edit, {
                    orgId,
                    projectId,
                    networkId,
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
                    action: deleteNetwork,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-1/2">
        <NetworkGeneralCard network={network} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}>
        <NetworkBindingsTable data={bindings} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}>
        <NetworkContextsTable data={contexts} />
      </motion.div>
    </motion.div>
  );
}
