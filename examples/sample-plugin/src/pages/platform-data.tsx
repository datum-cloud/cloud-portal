import { useDnsZones } from '../lib/api';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { useParams } from 'react-router';

/**
 * `portal.page/project` at `platform`, exposed as default export of
 * `PlatformData`. Read-only. Demonstrates the MILO-data tier: it lists the
 * current project's DNS zones through the portal's existing authenticated proxy
 * (`/api/proxy/…`) — no plugin proxy alias needed. The manifest declares
 * `requirements.permissions` {dns.networking.miloapis.com, dnszones, list} on
 * this extension, so the host RBAC-gates it before rendering. Styled with the
 * host-shared `@datum-cloud/datum-ui` components.
 */
export default function PlatformData() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: zones, isLoading, isError, error } = useDnsZones(projectId);

  return (
    <div data-testid="sample-platform-page" className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform data</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Project DNS zones, read live from the Milo control plane through the portal&apos;s
          authenticated proxy (<code>/api/proxy</code>). Same auth and RBAC path as every built-in
          page.
        </p>
      </div>

      {isLoading && (
        <div data-testid="sample-platform-loading" className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full max-w-2xl" />
          <Skeleton className="h-9 w-full max-w-2xl" />
          <Skeleton className="h-9 w-full max-w-2xl" />
        </div>
      )}

      {isError && (
        <p data-testid="sample-platform-error" className="text-destructive text-sm">
          Failed to load DNS zones: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {!isLoading && !isError && (zones?.length ?? 0) === 0 && (
        <p data-testid="sample-platform-empty" className="text-muted-foreground text-sm">
          No DNS zones in this project.
        </p>
      )}

      {zones && zones.length > 0 && (
        <Card className="max-w-2xl py-0">
          <CardContent className="p-0">
            <ul data-testid="sample-platform-list" className="divide-y">
              {zones.map((z) => (
                <li
                  key={z.name}
                  data-testid="sample-platform-zone"
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-medium">{z.name}</span>
                    {z.domainName && (
                      <span className="text-muted-foreground"> — {z.domainName}</span>
                    )}
                  </span>
                  {z.ready && (
                    <Badge type={z.ready === 'True' ? 'success' : 'secondary'} theme="light">
                      Ready: {z.ready}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
