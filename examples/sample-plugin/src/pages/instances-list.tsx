import { StatusBadge } from '../components/status-badge';
import { useInstances } from '../lib/api';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Link, useParams } from 'react-router';

/**
 * `portal.page/project` at `instances`, exposed as default export of
 * `InstancesList`. Lists instances from the plugin's own backend via the portal
 * proxy alias, demonstrating TanStack Query (host singleton), loading/error/
 * empty states, the UserToken mediation badge — and the host-shared
 * `@datum-cloud/datum-ui` components, so the page is styled exactly like a
 * built-in portal page.
 */
export default function InstancesList() {
  const { projectId, serviceSlug } = useParams<{ projectId: string; serviceSlug: string }>();
  const { data, isLoading, isError, error, isFetching, refetch } = useInstances();

  const instances = data?.data.items ?? [];
  const authForwarded = data?.meta.authorizationForwarded;
  const base = `/project/${projectId}/services/${serviceSlug ?? 'sample'}`;

  return (
    <div data-testid="sample-instances-page" className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instances</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Served by the plugin&apos;s own backend through the portal proxy (
            <code>/api/plugins/{serviceSlug ?? 'sample'}/proxy/api/instances</code>).
          </p>
        </div>
        <Button
          htmlType="button"
          type="secondary"
          theme="outline"
          size="small"
          data-testid="sample-instances-refresh"
          loading={isFetching}
          disabled={isFetching}
          onClick={() => refetch()}>
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {authForwarded !== undefined && (
        <div data-testid="sample-instances-auth-badge" className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">UserToken mediation:</span>
          <Badge type={authForwarded ? 'success' : 'warning'} theme="light">
            {authForwarded ? 'Authorization header forwarded ✓' : 'no Authorization header ✗'}
          </Badge>
        </div>
      )}

      {isLoading && (
        <div data-testid="sample-instances-loading" className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {isError && (
        <p data-testid="sample-instances-error" className="text-destructive text-sm">
          Failed to load instances: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {!isLoading && !isError && instances.length === 0 && (
        <p data-testid="sample-instances-empty" className="text-muted-foreground text-sm">
          No instances.
        </p>
      )}

      {instances.length > 0 && (
        <Card className="py-0">
          <CardContent className="p-0">
            <Table data-testid="sample-instances-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Specs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((inst) => (
                  <TableRow
                    key={inst.id}
                    data-testid="sample-instances-row"
                    data-instance-id={inst.id}>
                    <TableCell>
                      <Link
                        to={`${base}/instances/${inst.id}`}
                        className="text-primary font-medium hover:underline">
                        {inst.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inst.status} />
                    </TableCell>
                    <TableCell>{inst.region}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {inst.specs.cpu} vCPU · {inst.specs.memoryGiB} GiB · {inst.specs.disk}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
