import { DateTime } from '@/components/date-time';
import { cn } from '@datum-cloud/datum-ui/utils';

interface NoteMetaProps {
  creatorDisplay: string;
  createdAt: Date | string;
  className?: string;
}

export function NoteMeta({ creatorDisplay, createdAt, className }: NoteMetaProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="text-muted-foreground text-xs">Created by {creatorDisplay}</span>
      <span className="text-muted-foreground/50 text-xs">·</span>
      <DateTime
        className="text-muted-foreground/70 text-xs"
        date={createdAt}
        format="MMM d, yyyy HH:mm"
      />
    </div>
  );
}
