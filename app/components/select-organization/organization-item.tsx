import { ProfileIdentity } from '@/components/profile-identity';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { getInitials } from '@/utils/helpers/text.helper';
import { cn } from '@shadcn/lib/utils';
import { Building2, UserRound } from 'lucide-react';

export const OrganizationItem = ({
  org,
  className,
  hideAvatar = false,
  avatarClassName,
  labelClassName,
}: {
  org: Partial<IOrganization>;
  className?: string;
  hideAvatar?: boolean;
  avatarClassName?: string;
  labelClassName?: string;
}) => {
  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      {!hideAvatar && (
        <ProfileIdentity
          avatarOnly
          fallbackText={getInitials(org?.displayName ?? org?.name ?? 'Datum')}
          fallbackIcon={org?.type === OrganizationType.Personal ? UserRound : Building2}
          size="xs"
          className={avatarClassName}
          fallbackClassName="text-xs font-medium"
        />
      )}

      <div className={cn('grid flex-1 text-left text-sm leading-tight', labelClassName)}>
        <span className="truncate font-medium">{org?.displayName ?? org?.name}</span>
        {org?.type === OrganizationType.Personal && (
          <span className="text-muted-foreground truncate text-xs">Personal</span>
        )}
      </div>
    </div>
  );
};
