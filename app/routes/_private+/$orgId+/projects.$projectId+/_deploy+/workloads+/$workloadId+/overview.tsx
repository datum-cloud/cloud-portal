import { DateFormat } from '@/components/date-format/date-format';
import { MoreActions } from '@/components/more-actions/more-actions';
import { PageTitle } from '@/components/page-title/page-title';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { routes } from '@/constants/routes';
import { WorkloadFlow } from '@/features/workload/flow/flow';
import { WorkloadHelper } from '@/features/workload/helper';
import { WorkloadOverview } from '@/features/workload/overview';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { createInstancesControl } from '@/resources/control-plane/instances.control';
import { createWorkloadDeploymentsControl } from '@/resources/control-plane/workload-deployments.control';
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control';
import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';
import {
  IInstanceControlResponse,
  IWorkloadControlResponse,
  IWorkloadDeploymentControlResponse,
} from '@/resources/interfaces/workload.interface';
import { ROUTE_PATH as WORKLOADS_ACTIONS_ROUTE_PATH } from '@/routes/api+/workloads+/actions';
import { CustomError } from '@/utils/errorHandle';
import { mergeMeta, metaObject } from '@/utils/meta';
import { transformControlPlaneStatus } from '@/utils/misc';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ClockIcon, PencilIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import {
  MetaFunction,
  useParams,
  useSubmit,
  Link,
  LoaderFunctionArgs,
  AppLoadContext,
  data,
  useLoaderData,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find(
    (match) =>
      match.id ===
      'routes/_private+/$orgId+/projects.$projectId+/_deploy+/workloads+/$workloadId+/_layout'
  ) as any;

  const workload = match.data;
  return metaObject((workload as IWorkloadControlResponse)?.name || 'Workload');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { projectId, workloadId } = params;

  if (!projectId || !workloadId) {
    throw new CustomError('Project ID and workload ID are required', 400);
  }

  const workloadsControl = createWorkloadsControl(controlPlaneClient as Client);
  const workload = await workloadsControl.detail(projectId, workloadId);

  if (!workload) {
    throw new CustomError('Workload not found', 404);
  }

  const workloadDeploymentsControl = createWorkloadDeploymentsControl(controlPlaneClient as Client);
  const instancesControl = createInstancesControl(controlPlaneClient as Client);

  const deployments = await workloadDeploymentsControl.list(projectId, workload.uid);
  const instances = await instancesControl.list(projectId, workload.uid);

  return data({ deployments, instances, workload });
};

export default function WorkloadOverviewPage() {
  const { deployments, instances, workload } = useLoaderData<typeof loader>();

  const submit = useSubmit();
  const { confirm } = useConfirmationDialog();
  const { orgId, projectId, workloadId } = useParams();

  // revalidate every 10 seconds to keep deployment list fresh
  const revalidator = useRevalidateOnInterval({ enabled: true, interval: 10000 });

  const deleteWorkload = async () => {
    const data = workload as IWorkloadControlResponse;
    await confirm({
      title: 'Delete Workload',
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
      onSubmit: async () => {
        // Clear the interval when deleting a workload
        revalidator.clear();

        await submit(
          {
            workloadId: data?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: WORKLOADS_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
            fetcherKey: 'workload-resources',
            navigate: false,
          }
        );
      },
    });
  };

  const workloadMappingData = useMemo(() => {
    if (workload) {
      return WorkloadHelper.mappingSpecToForm(workload);
    }

    return {};
  }, [workload]);

  // Status of the workload
  const isWorkloadReady: boolean = useMemo(() => {
    if (workload) {
      const status: IControlPlaneStatus = transformControlPlaneStatus(workload.status);
      return status.status === ControlPlaneStatus.Success;
    }
    return false;
  }, [workload]);

  // Status of all instances
  const isAllInstancesReady: boolean = useMemo(() => {
    if (instances && instances.length > 0) {
      const statuses: IControlPlaneStatus[] = instances.map((instance: IInstanceControlResponse) =>
        transformControlPlaneStatus(instance.status)
      );
      return statuses.every((status) => status.status === ControlPlaneStatus.Success);
    }
    return false;
  }, [instances]);

  // Status of all deployments
  const isAllDeploymentsReady: boolean = useMemo(() => {
    if (deployments && deployments.length > 0) {
      const statuses: IControlPlaneStatus[] = deployments.map(
        (deployment: IWorkloadDeploymentControlResponse) =>
          transformControlPlaneStatus(deployment.status)
      );

      // Check if all deployments are ready
      return statuses?.every((status) => status.status === ControlPlaneStatus.Success);
    }
    return false;
  }, [deployments]);

  // Clear the interval when all resources are ready
  useEffect(() => {
    if (isWorkloadReady && isAllInstancesReady && isAllDeploymentsReady) {
      revalidator.clear();
    }
  }, [isWorkloadReady, isAllInstancesReady, isAllDeploymentsReady]);

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
          title={(workload as IWorkloadControlResponse)?.name ?? 'Workload'}
          description={
            <div className="flex items-center gap-1">
              <ClockIcon className="text-muted-foreground h-4 w-4" />
              <DateFormat
                className="text-muted-foreground text-sm"
                date={(workload as IWorkloadControlResponse)?.createdAt ?? ''}
              />
              <span className="text-muted-foreground text-sm">
                (
                {formatDistanceToNow(
                  new Date((workload as IWorkloadControlResponse)?.createdAt ?? ''),
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
                  to={getPathWithParams(routes.projects.deploy.workloads.detail.edit, {
                    orgId,
                    projectId,
                    workloadId,
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
                    action: deleteWorkload,
                  },
                ]}
              />
            </motion.div>
          }
        />
      </motion.div>

      <Tabs defaultValue="overview" className="w-full gap-6">
        <div className="mx-auto w-full max-w-6xl">
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="graph">Graph View</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview">
          <WorkloadOverview
            workload={workload as IWorkloadControlResponse}
            deployments={deployments as IWorkloadDeploymentControlResponse[]}
            instances={instances as IInstanceControlResponse[]}
          />
        </TabsContent>
        <TabsContent value="graph" className="max-h-screen min-h-[700px]">
          <WorkloadFlow workloadData={workloadMappingData as any} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
