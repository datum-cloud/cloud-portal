import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { cn, getInitials } from '@/utils/misc'

export const OrganizationItem = ({
  org,
  className,
  hideAvatar = false,
  avatarClassName,
  labelClassName,
}: {
  org: Partial<OrganizationModel>
  className?: string
  hideAvatar?: boolean
  avatarClassName?: string
  labelClassName?: string
}) => {
  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      {!hideAvatar && (
        <Avatar className={cn('size-6 rounded-md', avatarClassName)}>
          <AvatarFallback className="rounded-md bg-slate-400 text-primary-foreground">
            {getInitials(org?.name ?? '')}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('grid flex-1 text-left text-sm leading-tight', labelClassName)}>
        <span className="truncate font-medium">{org?.name}</span>
        {org?.personalOrg && (
          <span className="truncate text-xs text-muted-foreground">Personal</span>
        )}
      </div>
    </div>
  )
}
