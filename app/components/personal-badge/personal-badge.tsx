import { Badge } from '@datum-cloud/datum-ui/badge';
import { cn } from '@datum-cloud/datum-ui/utils';

export const PersonalBadge = ({ className }: { className?: string }) => {
  return (
    <Badge
      type="primary"
      theme="light"
      className={cn(
        'text-2xs px-1 py-1 leading-none font-medium tracking-wide uppercase',
        className
      )}>
      Personal
    </Badge>
  );
};
