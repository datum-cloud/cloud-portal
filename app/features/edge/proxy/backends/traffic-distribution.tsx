import { backendShares, formatSharePercent } from './share';
import { backendLabel } from './target';
import type { ProxyBackend } from '@/resources/http-proxies';
import { useMemo } from 'react';

/**
 * Share of traffic across a route's pool, derived from backend weights.
 *
 * Weight-derived, not measured: there is no per-backend request metric to
 * measure with, so this shows the split Envoy is configured to apply rather
 * than the split it observed.
 */
export const TrafficDistribution = ({ backends }: { backends: ProxyBackend[] }) => {
  const { shares, noTraffic } = useMemo(() => backendShares(backends), [backends]);

  // One backend takes everything by definition. A bar saying "100%" tells the
  // operator nothing they cannot see from the single row below it.
  if (backends.length < 2) return null;

  return (
    <div className="flex flex-col gap-2" data-e2e="alb-traffic-distribution">
      <p className="text-muted-foreground text-xs font-medium">Share of requests by weight</p>

      {noTraffic ? (
        <p className="text-muted-foreground text-sm">
          No backend is receiving traffic — every weight is 0.
        </p>
      ) : (
        <div
          className="bg-muted flex h-2 w-full overflow-hidden rounded-full"
          role="img"
          aria-label={shares
            .map((s) => `${backendLabel(s.backend)} ${formatSharePercent(s.percent)}`)
            .join(', ')}>
          {shares
            .filter((s) => !s.excluded)
            .map((s) => (
              <div
                key={s.backend.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${s.percent}%`, backgroundColor: s.color }}
              />
            ))}
        </div>
      )}

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {shares.map((s) => (
          <li key={s.backend.key} className="flex min-w-0 items-center gap-1.5 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="text-foreground truncate font-mono">{backendLabel(s.backend)}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatSharePercent(s.percent)}
              {s.excluded ? ' · excluded' : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
