import { DateTime } from '@/components/date-time';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

interface NoteMetaProps {
  creatorDisplay: string;
  createdAt: Date | string;
  className?: string;
}

export function NoteMeta({ creatorDisplay, createdAt, className }: NoteMetaProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Text size="xs" textColor="muted">
        Created by {creatorDisplay}
      </Text>
      <Text size="xs" className="text-muted-foreground/50">
        ·
      </Text>
      <DateTime
        className="text-muted-foreground/70 text-xs"
        date={createdAt}
        format="MMM d, yyyy HH:mm"
      />
    </div>
  );
}
