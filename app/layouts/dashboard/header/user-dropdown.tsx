import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { routes } from '@/constants/routes'
import { useApp } from '@/providers/app.provider'
import { cn, getInitials } from '@/utils/misc'
import { KeyIcon, LogOut, UserIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSubmit } from 'react-router'

const UserItem = ({
  fullName,
  description,
  className,
}: {
  fullName: string
  description?: string
  className?: string
}) => {
  return (
    <div
      className={cn('flex items-center gap-2 px-1 py-1.5 text-left text-sm', className)}>
      <Avatar className="size-8 rounded-lg">
        {/* <AvatarImage src={user?.avatarRemoteURL} alt={fullName} /> */}
        <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
      </Avatar>

      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{fullName}</span>
        {description && (
          <span className="text-muted-foreground truncate text-xs">{description}</span>
        )}
      </div>
    </div>
  )
}
export const UserDropdown = () => {
  const navigate = useNavigate()
  const submit = useSubmit()
  const { user } = useApp()
  const [open, setOpen] = useState(false)

  const fullName = `${user?.given_name} ${user?.family_name}`

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 cursor-pointer p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden data-[state=open]:bg-transparent">
          <Avatar className="size-8 rounded-full">
            {/* <AvatarImage src={user?.avatarRemoteURL} alt={user?.displayName} /> */}
            <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
          </Avatar>
          {/* <ChevronDownIcon className="size-4 text-primary/60" /> */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
        align="end"
        sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <UserItem fullName={fullName} description={user?.email} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => navigate(routes.account.root)}>
            <UserIcon />
            Your Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => navigate(routes.account.apiKeys.root)}>
            <KeyIcon />
            API Keys
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="text-destructive"
          onClick={() => {
            submit(null, { method: 'POST', action: routes.auth.logOut })
          }}>
          <Button
            type="submit"
            variant="link"
            className="focus:text-destructive flex h-8 w-full cursor-pointer justify-start text-left hover:bg-transparent hover:no-underline focus-visible:ring-0 focus-visible:ring-offset-0">
            <LogOut className="text-destructive size-4" />
            Log out
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
