import { OrganizationSwitcher } from './org-switcher';
import { ProjectSwitcher } from './project-switcher';
import { UserDropdown } from './user-dropdown';
import { LogoIcon } from '@/components/logo/logo-icon';
import { NotificationDropdown } from '@/components/notification';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { paths } from '@/utils/config/paths.config';
import { Button } from '@datum-ui/components';
import { Tooltip } from '@datum-ui/components';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router';

export const Header = ({
  currentProject,
  currentOrg,
}: {
  currentProject?: IProjectControlResponse;
  currentOrg?: IOrganization;
}) => {
  return (
    <header className="bg-background sticky top-0 z-50 flex h-[54px] w-full max-w-screen shrink-0 items-center justify-between gap-4 border-b px-4 py-3.5">
      {/* Left Section */}
      <div className="flex flex-1 items-center">
        <Link to={paths.account.root} className="mr-6 flex items-center justify-center">
          <LogoIcon width={21} />
        </Link>
        {currentOrg && <OrganizationSwitcher currentOrg={currentOrg} />}
        {currentProject && (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                opacity="0.1"
                className="stroke-foreground"
                d="M9.96004 1.31641L4.04004 12.6837"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <ProjectSwitcher currentProject={currentProject} triggerClassName="w-4 h-4" />
          </>
        )}
      </div>
      {/* Right Section */}
      <div className="flex items-center justify-end">
        <div className="flex h-full items-center gap-1.5">
          <Tooltip message="Docs">
            <Link to="https://datum.net/docs/" target="_blank" rel="noreferrer">
              <Button
                type="quaternary"
                theme="outline"
                size="small"
                className="h-7 w-7 rounded-lg p-0">
                <IconWrapper icon={BookOpen} className="text-icon-primary size-3.5" />
              </Button>
            </Link>
          </Tooltip>

          {/* Notification Dropdown, polling every 15 minutes */}
          <NotificationDropdown defaultTab="invitation" />

          <UserDropdown />
        </div>
      </div>
    </header>
  );
};
