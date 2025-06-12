import { OrganizationSwitcher } from './org-switcher';
import { UserDropdown } from '@/components/header/user-dropdown';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleHelp } from 'lucide-react';
import { Link } from 'react-router';

export const Header = () => {
  return (
    <header className="bg-background sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b">
      {/* Left Section */}
      <div className="flex flex-1 items-center px-4">
        <SidebarTrigger className="-ml-1 cursor-pointer" />
        <OrganizationSwitcher />
      </div>
      {/* Right Section */}
      <div className="flex h-9 flex-1 items-center justify-end gap-3 pr-4">
        {/* <SearchBar /> */}
        <div className="flex h-full items-center gap-2">
          <Button variant="outline" size="sm" className="cursor-pointer px-2">
            Feedback
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="https://docs.datum.net/" target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm" className="cursor-pointer">
                  <CircleHelp />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Docs</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <UserDropdown />
      </div>
    </header>
  );
};
