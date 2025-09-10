import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { OrganizationSwitcher } from '@/layouts/dashboard/header/org-switcher';
import { ProjectSwitcher } from '@/layouts/dashboard/header/project-switcher';
import { UserDropdown } from '@/layouts/dashboard/header/user-dropdown';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { CircleHelp, SlashIcon } from 'lucide-react';
import { Link } from 'react-router';

export const Header = ({
  hideSidebar = false,
  currentProject,
  currentOrg,
  title,
}: {
  hideSidebar?: boolean;
  currentProject?: IProjectControlResponse;
  currentOrg?: IOrganization;
  title?: string;
}) => {
  return (
    <header className="bg-background sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between gap-4 border-b px-4">
      {/* Left Section */}
      <div className="flex flex-1 items-center">
        {!hideSidebar && <SidebarTrigger className="-ml-1 cursor-pointer" />}
        {title && <span className="ml-2 text-sm font-semibold">{title}</span>}
        {currentOrg && <OrganizationSwitcher currentOrg={currentOrg} />}
        {currentProject && (
          <>
            <SlashIcon size={14} className="text-primary/20 mx-1" />
            <ProjectSwitcher currentProject={currentProject} />
          </>
        )}
      </div>
      {/* Right Section */}
      <div className="flex h-9 flex-1 items-center justify-end gap-3">
        {/* <SearchBar /> */}
        <div className="flex h-full items-center gap-2">
          {/* <Button variant="outline" size="sm" className="cursor-pointer px-2">
            Feedback
          </Button> */}
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
