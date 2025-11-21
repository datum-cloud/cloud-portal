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
import { BookOpen, SlashIcon } from 'lucide-react';
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
        <Link to={paths.account.root} className="mr-6 flex size-7 items-center gap-2">
          <LogoIcon width={21} />
        </Link>
        {currentOrg && <OrganizationSwitcher currentOrg={currentOrg} />}
        {currentProject && (
          <>
            <SlashIcon size={14} className="text-foreground/10 mx-2.5" />
            <ProjectSwitcher currentProject={currentProject} triggerClassName="h-7 w-fit" />
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
                className="h-7 w-7 rounded-xl p-0">
                <BookOpen className="text-quaternary-foreground size-3.5" />
              </Button>
            </Link>
          </Tooltip>

          <NotificationDropdown pollingInterval={60000} defaultTab="invitation" />

          <UserDropdown />
        </div>
      </div>
    </header>
  );
};
