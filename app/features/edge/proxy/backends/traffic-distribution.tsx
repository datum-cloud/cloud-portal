import { backendShares, formatSharePercent } from './share';
import { backendLabel, routePathLabel } from './target';
import { StatusChip } from '@/components/card';
import type { ProxyRoute } from '@/resources/http-proxies';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { useMemo, type ReactNode } from 'react';

/**
 * Share of traffic across a route's pool, derived from backend weights.
 *
 * Weight-derived, not measured. The mockup's Weight/Requests toggle is absent
 * because the Requests side has no source: no per-backend request metric
 * exists, so there is nothing to switch to. The subtitle says which of the two
 * this is rather than implying a choice that cannot be offered.
 */
export const TrafficDistributionCard = ({
  route,
  showPath,
  action,
}: {
  route: ProxyRoute;
  /** Name the route when there is more than one pool on the page. */
  showPath: boolean;
  /**
   * Header control. The load balancing algorithm lives here because it decides
   * how this distribution is arrived at — but it is proxy-scoped, so only the
   * first route's card is given it.
   */
  action?: ReactNode;
}) => {
  const { shares, noTraffic } = useMemo(() => backendShares(route.backends), [route.backends]);

  const hasBar = route.backends.length >= 2;

  // One backend takes everything by definition, so a bar reading 100% says
  // nothing the single row below it does not. The card still renders when it
  // is hosting the algorithm control, which needs a stable home.
  if (!hasBar && !action) return null;

  return (
    <Card
      size="sm"
      sectioned
      className="w-full overflow-hidden"
      data-e2e="alb-traffic-distribution">
      <CardHeader size="sm" className="pb-0!">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
            Traffic distribution
            {showPath ? <StatusChip tone="muted">{routePathLabel(route)}</StatusChip> : null}
          </CardTitle>
          <CardDescription className="text-xs">Share of requests by weight</CardDescription>
        </div>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {!hasBar ? (
          <p className="text-muted-foreground text-sm">
            {route.backends.length === 1
              ? 'Every request goes to the only backend on this route.'
              : 'Add a backend so this route has somewhere to send traffic.'}
          </p>
        ) : noTraffic ? (
          <p className="text-muted-foreground text-sm">
            No backend is receiving traffic — every weight is 0.
          </p>
        ) : (
          <div
            className="bg-muted flex h-6 w-full overflow-hidden rounded-md"
            role="img"
            aria-label={shares
              .map((s) => `${backendLabel(s.backend)} ${formatSharePercent(s.percent)}`)
              .join(', ')}>
            {shares
              .filter((s) => !s.excluded)
              .map((s) => (
                <div
                  key={s.backend.key}
                  className="flex h-full items-center justify-center overflow-hidden"
                  style={{ width: `${s.percent}%`, backgroundColor: s.color }}>
                  {/* Only label a segment wide enough to hold the text. */}
                  {s.percent >= 8 ? (
                    <span className="text-2xs font-medium text-white tabular-nums">
                      {formatSharePercent(s.percent)}
                    </span>
                  ) : null}
                </div>
              ))}
          </div>
        )}

        {hasBar ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {shares
                .filter((s) => !s.excluded)
                .map((s) => (
                  <li key={s.backend.key} className="flex min-w-0 items-center gap-1.5 text-xs">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    <span className="text-foreground truncate font-mono">
                      {backendLabel(s.backend)}
                    </span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {formatSharePercent(s.percent)}
                    </span>
                  </li>
                ))}
            </ul>

            {/* A zero-weight backend is configured but drained. Saying so here
              matches the mockup's "excluded" note, minus the health reason
              it had no way to know. */}
            {shares.some((s) => s.excluded) ? (
              <p className="text-muted-foreground text-xs">
                {shares
                  .filter((s) => s.excluded)
                  .map((s) => backendLabel(s.backend))
                  .join(', ')}{' '}
                excluded · weight 0
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
