import { StatusBadge } from '../components/status-badge';
import { useInstance, useRestartInstance } from '../lib/api';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Link, useParams } from 'react-router';

/**
 * `portal.page/project` at `instances/:instanceId`, exposed as default export of
 * `InstanceDetail`. Shows one instance and a Restart button wired to a
 * `useMutation` that POSTs to the plugin backend and invalidates the host cache.
 * While the instance is Restarting the detail query polls until it flips back.
 * Styled with the host-shared `@datum-cloud/datum-ui` components.
 */
export default function InstanceDetail() {
  const { projectId, serviceSlug, instanceId } = useParams<{
    projectId: string;
    serviceSlug: string;
    instanceId: string;
  }>();
  const id = instanceId ?? '';
  const { data, isLoading, isError, error } = useInstance(id);
  const restart = useRestartInstance(id);

  const instance = data?.data;
  const base = `/project/${projectId}/services/${serviceSlug ?? 'sample'}`;
  const restarting = instance?.status === 'Restarting' || restart.isPending;

  return (
    <div data-testid="sample-instance-detail" className="flex flex-col gap-4 p-6">
      <p className="text-sm">
        <Link to={`${base}/instances`} className="text-muted-foreground hover:text-foreground">
          ← Instances
        </Link>
      </p>

      {isLoading && (
        <div data-testid="sample-instance-detail-loading" className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full max-w-xl" />
        </div>
      )}

      {isError && (
        <p data-testid="sample-instance-detail-error" className="text-destructive text-sm">
          Failed to load instance: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {instance && (
        <>
          <div className="flex items-center gap-3">
            <h1
              data-testid="sample-instance-detail-name"
              className="text-2xl font-semibold tracking-tight">
              {instance.name}
            </h1>
            <span data-testid="sample-instance-detail-status">
              <StatusBadge status={instance.status} />
            </span>
          </div>

          <Card className="max-w-xl">
            <CardContent>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground font-medium">ID</dt>
                <dd>{instance.id}</dd>
                <dt className="text-muted-foreground font-medium">Region</dt>
                <dd>{instance.region}</dd>
                <dt className="text-muted-foreground font-medium">Specs</dt>
                <dd>
                  {instance.specs.cpu} vCPU · {instance.specs.memoryGiB} GiB · {instance.specs.disk}
                </dd>
                <dt className="text-muted-foreground font-medium">Created</dt>
                <dd>{instance.createdAt}</dd>
              </dl>
            </CardContent>
          </Card>

          <div>
            <Button
              htmlType="button"
              type="primary"
              theme="solid"
              size="small"
              data-testid="sample-instance-restart"
              loading={restarting}
              disabled={restarting}
              onClick={() => restart.mutate()}>
              {restarting ? 'Restarting…' : 'Restart'}
            </Button>
          </div>

          {restart.isError && (
            <p className="text-destructive text-sm">
              Restart failed:{' '}
              {restart.error instanceof Error ? restart.error.message : 'unknown error'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
