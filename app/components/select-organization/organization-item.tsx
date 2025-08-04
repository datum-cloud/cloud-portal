import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { cn } from '@/utils/common';
import { getInitials } from '@/utils/text';

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
        <Avatar className={cn('size-6 rounded-md', avatarClassName)}>
          <AvatarFallback className="text-primary-foreground rounded-md bg-slate-400">
            {getInitials((org?.displayName ?? org?.name) as string)}
          </AvatarFallback>
        </Avatar>
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
