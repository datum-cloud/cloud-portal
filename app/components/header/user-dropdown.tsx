import { DarkModeIcon } from '@/components/icon/dark-mode';
import { LightModeIcon } from '@/components/icon/light-mode';
import { SystemModeIcon } from '@/components/icon/system-mode';
import { useTheme } from '@/modules/datum-themes';
import { useApp } from '@/providers/app.provider';
import { ThemeValue, useUpdateUserPreferences } from '@/resources/users';
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
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@shadcn/ui/avatar';
import { CheckIcon, LogOut, UserCogIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: LightModeIcon },
  { value: 'dark', label: 'Dark', icon: DarkModeIcon },
  { value: 'system', label: 'System', icon: SystemModeIcon },
] as const;

export const UserDropdown = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, userPreferences, setUser } = useApp();
  const userId = user?.sub ?? 'me';

  const [currentTheme, setCurrentTheme] = useState<ThemeValue>(resolvedTheme as ThemeValue);
  const [open, setOpen] = useState(false);

  const updatePreferencesMutation = useUpdateUserPreferences(userId, {
    onSuccess: (data) => {
      setUser(data);
    },
  });

  const updateTheme = (theme: ThemeValue) => {
    setTheme(theme);
    setCurrentTheme(theme);

    updatePreferencesMutation.mutate({ theme });
  };

  useEffect(() => {
    if (userPreferences) {
      setCurrentTheme(userPreferences.theme);
    }
  }, [userPreferences]);

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
          {THEME_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 font-normal"
              onClick={() => updateTheme(option.value)}>
              <div className="flex items-center gap-2">
                <Icon icon={option.icon} size={14} absoluteStrokeWidth={false} />
                <span className="text-foreground text-xs">{option.label}</span>
              </div>
              {currentTheme === option.value && (
                <Icon icon={CheckIcon} size={16} className="text-primary" strokeWidth={1.5} />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-3 py-2 font-normal"
            onClick={() => navigate(paths.account.settings.general)}>
            <div className="flex items-center gap-2">
              <Icon icon={UserCogIcon} size={14} />
              <span className="text-foreground text-xs">Account Settings</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            variant="destructive"
            className="data-[variant=destructive]:*:[svg]:!text-destructive cursor-pointer rounded-lg px-3 py-2 font-normal"
            onClick={() => {
              navigate(paths.auth.logOut, { replace: true, preventScrollReset: true });
            }}>
            <div className="flex items-center gap-2">
              <Icon icon={LogOut} size={14} />
              <span className="text-destructive text-xs">Log Out</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
