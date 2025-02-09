import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { getInitials, cn } from '@/utils/misc'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export const OrganizationItem = ({
  org,
  className,
}: {
  org: OrganizationModel
  className?: string
}) => {
  return (
    <div className={cn('w-fulll flex items-center gap-2', className)}>
      <Avatar className="size-8 rounded-lg">
        {/* <AvatarImage src={currentOrg?.avatarRemoteURL} alt={currentOrg?.name} /> */}
        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
          {getInitials(org?.name)}
        </AvatarFallback>
      </Avatar>

      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{org?.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {org?.personalOrg ? 'Individual' : 'Business'}
        </span>
      </div>
    </div>
  )
}
