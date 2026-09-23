import type { ActivePopMarker } from './active-pops-map';
import { formatActivePopMetrics } from './active-pops-metrics';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { CSSProperties } from 'react';

export function ActivePopTooltipCard({
  pop,
  className,
  style,
}: {
  pop: ActivePopMarker;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        'bg-background text-foreground pointer-events-none flex w-44 flex-col gap-1.5 rounded-lg border px-3 py-2 shadow-lg',
        className
      )}
      style={style}>
      <div className="flex items-start justify-between gap-2">
        <Text as="p" size="xs" weight="medium">
          {pop.city}
        </Text>
        <Badge
          type={pop.active ? 'primary' : 'quaternary'}
          theme={pop.active ? 'light' : 'outline'}
          className="text-4xs shrink-0 font-normal">
          {pop.active ? 'Traffic' : 'Idle'}
        </Badge>
      </div>
      <Text as="p" size="xs" textColor="muted">
        {pop.subtitle}
      </Text>
      {pop.active ? (
        <Text as="p" size="xs" textColor="muted" className="tabular-nums">
          {formatActivePopMetrics(pop.metrics)}
        </Text>
      ) : (
        <Text as="p" size="xs" textColor="muted">
          No recent traffic
        </Text>
      )}
    </div>
  );
}

export function tooltipFlipTransform(x: number, y: number): Pick<CSSProperties, 'transform'> {
  const flipX = x > 32;
  const flipY = y > 70;
  return {
    transform: `translate(${flipX ? 'calc(-100% - 10px)' : '10px'}, ${flipY ? 'calc(-100% - 10px)' : '10px'})`,
  };
}

export function tooltipOffsetStyle(
  x: number,
  y: number,
  extraOffsetX = 0,
  extraOffsetY = 0
): CSSProperties {
  const flip = tooltipFlipTransform(x, y);
  const extra =
    extraOffsetX || extraOffsetY ? ` translate(${extraOffsetX}px, ${extraOffsetY}px)` : '';
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: `${flip.transform}${extra}`,
  };
}
