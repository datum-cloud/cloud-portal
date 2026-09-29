import { type BackendRow } from './backend-pool';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { SplitIcon } from 'lucide-react';

/** Segments narrower than this don't have room for their label. */
const LABEL_MIN_SHARE = 8;

/**
 * Configured split of the pool's traffic, from weights. Envoy's request
 * metrics aren't broken down per backend, so this is the intended share, not
 * a live measurement.
 */
export function HttpProxyTrafficDistributionCard({ rows }: { rows: BackendRow[] }) {
  const weighted = rows.filter((row) => row.share > 0);
  const drained = rows.filter((row) => row.drained);

  return (
    <Card size="sm" className="w-full" data-e2e="alb-traffic-distribution">
      <CardHeader size="sm">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={SplitIcon} size={16} className="text-secondary" />
          Traffic distribution
        </CardTitle>
        <CardDescription className="text-xs">
          Share of requests each backend is weighted to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {weighted.length === 0 ? (
          <div className="bg-muted flex h-5.5 items-center justify-center rounded-md">
            <Text size="xs" textColor="muted">
              Every backend has a weight of 0, so no requests can be served
            </Text>
          </div>
        ) : (
          <div
            className="flex h-5.5 w-full gap-0.5"
            role="img"
            aria-label={weighted.map((row) => `${row.title} ${row.shareLabel}`).join(', ')}>
            {weighted.map((row, position) => (
              // Tooltip wraps its child in an inline-flex span that shrinks to
              // content, so the width sits out here and *:size-full stretches it.
              <div
                key={row.index}
                className="h-full min-w-1 *:size-full"
                style={{ width: `${row.share}%` }}>
                <Tooltip message={`${row.title} · weight ${row.weight}`}>
                  <div
                    // The ends of the bar are rounded on the segments themselves;
                    // clipping them with overflow-hidden on the bar left the top
                    // corners square. Joins between segments stay straight.
                    className={cn(
                      'flex size-full items-center justify-center',
                      position === 0 && 'rounded-l-md',
                      position === weighted.length - 1 && 'rounded-r-md'
                    )}
                    style={{ backgroundColor: row.color }}>
                    {row.share >= LABEL_MIN_SHARE ? (
                      <Text as="span" size="3xs" weight="bold" className="text-white tabular-nums">
                        {row.shareLabel}
                      </Text>
                    ) : null}
                  </div>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
          {rows.map((row) => (
            <span key={row.index} className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: row.drained ? 'var(--border)' : row.color }}
                aria-hidden="true"
              />
              <Text size="xs" weight="medium" ellipsis className="max-w-56 font-mono">
                {row.title}
              </Text>
              <Text size="xs" weight="semibold" textColor="muted" className="tabular-nums">
                {row.shareLabel}
              </Text>
            </span>
          ))}
          {drained.length > 0 ? (
            <Text size="xs" textColor="muted" className="ml-auto">
              {drained.length === 1
                ? `${drained[0].title} drained · weight 0`
                : `${drained.length} backends drained · weight 0`}
            </Text>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
