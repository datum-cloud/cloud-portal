import { DeployWorkloadForm } from '@/features/workload/form/deploy-workload-form';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runRouteGate } from '@/modules/rbac/run-resource-loader';
import { type LoaderFunctionArgs, useParams } from 'react-router';

const route = defineResourceRoute({
  type: 'gate',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to create workloads.",
  metaTitle: 'Deploy a Workload',
});

export const loader = (args: LoaderFunctionArgs) =>
  runRouteGate(args, {
    resource: 'workloads',
    verb: 'create',
    group: 'compute.datumapis.com',
    scope: 'project',
  });

export const meta = route.meta;

export default route.Page(() => {
  const { projectId = '' } = useParams();

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="flex w-full items-center justify-between">
        <span data-e2e="page-title" className="font-title text-3xl leading-none">
          Deploy a Container Workload
        </span>
      </div>

      <DeployWorkloadForm projectId={projectId} />
    </div>
  );
});
