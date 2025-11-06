import { useApp } from '@/providers/app.provider';
import { paths } from '@/utils/config/paths.config';
import { getInitials } from '@/utils/helpers/text.helper';
import { Button } from '@datum-ui/components';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Avatar, AvatarFallback } from '@shadcn/ui/avatar';
import { LogOut, UserCogIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSubmit } from 'react-router';

const UserItem = ({
  type = 'avatar',
  fullName,
  description,
  className,
}: {
  type?: 'avatar' | 'full';
  fullName: string;
  description?: string;
  className?: string;
}) => {
  return (
    <div className={cn('flex items-center gap-2 px-1 py-1.5 text-left text-sm', className)}>
      <Avatar className="size-8 rounded-md">
        {/* <AvatarImage src={user?.avatarRemoteURL} alt={fullName} /> */}
        <AvatarFallback className="bg-primary text-primary-foreground rounded-md font-semibold">
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>

      {type === 'full' && (
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{fullName}</span>
          {description && (
            <span className="text-muted-foreground truncate text-xs">{description}</span>
          )}
        </div>
      )}
    </div>
  );
};
export const UserDropdown = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const submit = useSubmit();
  const { user } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="quaternary"
          theme="borderless"
          size="small"
          className={cn(
            'h-8 cursor-pointer p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden data-[state=open]:bg-transparent',
            className
          )}>
          <UserItem type="avatar" fullName={user?.fullName!} className="px-0" />
          {/* <ChevronDownIcon className="size-4 text-primary/60" /> */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
        align="end"
        sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <UserItem type="full" fullName={user?.fullName!} description={user?.email} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => navigate(paths.account.preferences)}>
            <UserCogIcon />
            Account preferences
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="text-destructive"
          onClick={() => {
            submit(null, { method: 'POST', action: paths.auth.logOut });
          }}>
          <Button
            htmlType="submit"
            type="quaternary"
            theme="borderless"
            className="focus:text-destructive flex h-8 w-full cursor-pointer justify-start text-left hover:bg-transparent hover:no-underline focus-visible:ring-0 focus-visible:ring-offset-0">
            <LogOut className="text-destructive size-4" />
            Log out
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
