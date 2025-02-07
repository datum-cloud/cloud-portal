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
import { ChevronDownIcon, LogOut, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useApp } from '@/providers/app.provider'
import { UserModel } from '@/resources/gql/models/user.model'
import { OrganizationSwitcher } from './org-switcher'
import { Form } from 'react-router'
import { routes } from '@/constants/routes'

const UserAvatar = ({ user }: { user: UserModel }) => {
  return (
    <Avatar className="size-8 rounded-lg">
      <AvatarImage src={user?.avatarRemoteURL} alt={user?.displayName} />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}
export const UserDropdown = () => {
  const { user, organization } = useApp()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 gap-4 p-2 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-primary/5">
          <div className="flex max-w-52 items-center gap-2">
            <UserAvatar user={user!} />

            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {organization?.name}
              </span>
            </div>
          </div>
          <ChevronDownIcon className="size-4 text-primary/60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="end"
        sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <UserAvatar user={user!} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="truncate text-xs">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Sparkles />
            Upgrade to Pro
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <OrganizationSwitcher />
        <DropdownMenuSeparator />
        <Form method="POST" action={routes.auth.signOut}>
          <DropdownMenuItem asChild className="text-destructive">
            <Button
              type="submit"
              variant="link"
              className="flex h-8 w-full justify-start text-left hover:bg-transparent hover:no-underline focus-visible:ring-0 focus-visible:ring-offset-0">
              <LogOut />
              Log out
            </Button>
          </DropdownMenuItem>
        </Form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
