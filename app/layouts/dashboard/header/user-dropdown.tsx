import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { Button } from '@/components/ui/button'
import { LogOut, UserIcon, KeyIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useApp } from '@/providers/app.provider'
import { UserModel } from '@/resources/gql/models/user.model'
import { Form, useNavigate } from 'react-router'
import { routes } from '@/constants/routes'
import { getInitials, cn } from '@/utils/misc'
import { useState } from 'react'
const UserItem = ({
  user,
  description,
  className,
}: {
  user: UserModel
  description?: string
  className?: string
}) => {
  const fullName = `${user?.firstName} ${user?.lastName}`

  return (
    <div
      className={cn('flex items-center gap-2 px-1 py-1.5 text-left text-sm', className)}>
      <Avatar className="size-8 rounded-lg">
        <AvatarImage src={user?.avatarRemoteURL} alt={fullName} />
        <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
      </Avatar>

      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">
          {user?.firstName} {user?.lastName}
        </span>
        {description && (
          <span className="truncate text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  )
}
export const UserDropdown = () => {
  const navigate = useNavigate()
  const { user } = useApp()
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 p-0 hover:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-transparent">
          <Avatar className="size-8 rounded-full">
            <AvatarImage src={user?.avatarRemoteURL} alt={user?.displayName} />
            <AvatarFallback>
              {getInitials(`${user?.firstName} ${user?.lastName}`)}
            </AvatarFallback>
          </Avatar>
          {/* <ChevronDownIcon className="size-4 text-primary/60" /> */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg"
        align="end"
        sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <UserItem user={user!} description={user?.email} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>User Profile</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => navigate(routes.account.profile)}>
            <UserIcon />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => navigate(routes.account.apiKeys)}>
            <KeyIcon />
            API Access
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <Form method="POST" action={routes.auth.signOut}>
          <DropdownMenuItem asChild className="text-destructive">
            <Button
              type="submit"
              variant="link"
              className="flex h-8 w-full cursor-pointer justify-start text-left hover:bg-transparent hover:no-underline focus:text-destructive focus-visible:ring-0 focus-visible:ring-offset-0">
              <LogOut />
              Sign out
            </Button>
          </DropdownMenuItem>
        </Form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
