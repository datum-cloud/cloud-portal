import { PersonalBadge } from '@/components/personal-badge/personal-badge';
import type { Organization } from '@/resources/organizations';
import { cn } from '@shadcn/lib/utils';

export const OrganizationItem = ({
  org,
  className,
}: {
  org: Partial<Organization>;
  className?: string;
}) => {
  const isPersonal = org?.type === 'Personal';
  return (
    <div className={cn('flex w-full items-center gap-3', className)}>
      <span className={cn('truncate text-xs font-medium', isPersonal && 'max-w-44')}>
        {org?.displayName ?? org?.name}
      </span>
      {isPersonal && <PersonalBadge />}
    </div>
  );
};
