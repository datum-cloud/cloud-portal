import type { Organization } from '@/resources/organizations';
import { Text } from '@datum-cloud/datum-ui/typography';
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
      <Text size="xs" weight="medium" ellipsis>
        {org?.displayName ?? org?.name}
      </Text>
    </div>
  );
};
