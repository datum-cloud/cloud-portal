import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { getInitials, cn } from '@/utils/misc'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
    <div className={cn('w-fulll flex items-center gap-2', className)}>
      {!hideAvatar && (
        <Avatar className={cn('size-8 rounded-lg', avatarClassName)}>
          {/* <AvatarImage src={currentOrg?.avatarRemoteURL} alt={currentOrg?.name} /> */}
          <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
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
