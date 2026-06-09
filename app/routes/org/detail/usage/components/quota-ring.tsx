import { cn } from '@datum-cloud/datum-ui/utils';

interface QuotaRingProps {
  used: number;
  limit: number;
  /** Outer diameter in pixels. */
  size?: number;
  className?: string;
}

/**
 * Tiny circular progress indicator used next to each meter's
 * `used / limit` figure. datum-ui has no ring primitive, so this is a
 * hand-rolled SVG — the track uses `--border` (which stays visible
 * against the card in both light and dark themes; `--muted` blended into
 * the dark surface), the fill `--primary`, and the stroke turns
 * destructive once the quota is effectively exhausted.
 */
export function QuotaRing({ used, limit, size = 18, className }: QuotaRingProps) {
  const ratio = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  const strokeWidth = Math.max(2, Math.round(size / 9));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const isFull = ratio >= 0.999;

  const pct = Math.round(ratio * 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
      role="img"
      aria-label={`${pct}% of quota used`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      {ratio > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isFull ? 'var(--destructive)' : 'var(--primary)'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
}
