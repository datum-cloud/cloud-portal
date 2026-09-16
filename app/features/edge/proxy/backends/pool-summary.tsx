import type { ProxyRoute } from '@/resources/http-proxies';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';

/**
 * The stat row.
 *
 * Only one tile has anything behind it. The mockup's Healthy, Throughput and
 * Active connections tiles need per-backend health and request metrics, and
 * neither exists: the ALB series are vhost-scoped, so there is nothing to
 * attribute to an individual backend. They are left out rather than filled
 * with zeros that would read as a healthy idle pool.
 */
export const ProxyPoolSummary = ({ routes }: { routes: ProxyRoute[] }) => {
  const backendCount = routes.reduce((total, route) => total + route.backends.length, 0);

  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4" data-e2e="alb-pool-summary">
      <Card size="sm" className="w-full">
        <CardContent className="flex min-w-0 flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium">Backends</span>
          <span className="text-foreground flex h-8 items-center text-2xl font-semibold tabular-nums">
            {backendCount}
          </span>
          <span className="text-muted-foreground text-2xs">
            {routes.length > 1 ? `across ${routes.length} routes` : 'in pool'}
          </span>
        </CardContent>
      </Card>
    </div>
  );
};
