import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * Read-only rendering of a boolean setting: a coloured dot plus a label.
 * Used in card view mode where edit mode shows a Switch.
 */
export function ToggleState({
  on,
  onLabel = 'Enabled',
  offLabel = 'Disabled',
  className,
}: {
  on: boolean;
  onLabel?: string;
  offLabel?: string;
  className?: string;
}) {
  return (
    <Text className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          on ? 'bg-(--color-badge-success)' : 'bg-muted-foreground/40'
        )}
      />
      <span className={on ? undefined : 'text-muted-foreground'}>{on ? onLabel : offLabel}</span>
    </Text>
  );
}
