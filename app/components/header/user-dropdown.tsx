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
import { Avatar, AvatarFallback, AvatarImage } from '@shadcn/ui/avatar';
import { LogOut, UserCogIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSubmit } from 'react-router';

export const UserDropdown = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const submit = useSubmit();
  const { user } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="primary"
          theme="solid"
          size="small"
          className={cn(
            'h-7 w-7 cursor-pointer rounded-lg border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0',
            className
          )}>
          <Avatar className="size-full rounded-lg">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.fullName || 'User'} />}
            <AvatarFallback className="rounded-lg bg-transparent font-semibold">
              {getInitials(user?.fullName || '')}
            </AvatarFallback>
          </Avatar>
          {/* <ChevronDownIcon className="size-4 text-primary/60" /> */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
        align="end"
        sideOffset={4}>
        <DropdownMenuLabel className="px-3 py-2 font-normal">
          <div className="grid flex-1 text-left text-xs">
            <span className="text-primary truncate font-semibold">{user?.fullName}</span>
            <span className="text-foreground truncate font-medium">{user?.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-3 py-2 font-normal"
            onClick={() => navigate(paths.account.preferences)}>
            <div className="flex items-center gap-2">
              <UserCogIcon size={14} />
              <span className="text-foreground text-xs">Account Settings</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            variant="destructive"
            className="data-[variant=destructive]:*:[svg]:!text-destructive cursor-pointer rounded-lg px-3 py-2 font-normal"
            onClick={() => {
              submit(null, { method: 'POST', action: paths.auth.logOut });
            }}>
            <div className="flex items-center gap-2">
              <LogOut size={14} />
              <span className="text-destructive text-xs">Log Out</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
