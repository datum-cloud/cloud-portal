import type { Organization } from '@/resources/organizations';
import { cn } from '@datum-cloud/datum-ui/utils';

export const OrganizationItem = ({
  org,
  className,
}: {
  org: Partial<Organization>;
  className?: string;
}) => {
  return (
    <div className={cn('flex w-full items-center gap-3', className)}>
      <span className="truncate text-xs font-medium">{org?.displayName ?? org?.name}</span>
    </div>
  );
};
