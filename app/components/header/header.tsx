import { OrgProjectSwitcher } from './org-project-switcher';
import { UserDropdown } from './user-dropdown';
import { LogoIcon } from '@/components/logo/logo-icon';
import { NotificationDropdown } from '@/components/notification';
import { helpScoutAPI } from '@/modules/helpscout';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { Button } from '@datum-ui/components';
import { Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { TaskQueueDropdown } from '@datum-ui/components/task-queue';
import { BookOpen, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router';

export const Header = ({
  currentProject,
  currentOrg,
}: {
  currentProject?: Project;
  currentOrg?: Organization;
}) => {
  return (
    <header className="bg-background border-sidebar-border sticky top-0 z-50 flex h-12 w-full items-center justify-between gap-4 border-b px-4">
      {/* Left Section */}
      <div className="flex flex-1 items-center">
        <Link to={paths.account.root} className="mr-6 flex shrink-0 items-center justify-center">
          <LogoIcon width={21} />
        </Link>
        <div className="hidden md:block">
          <OrgProjectSwitcher currentOrg={currentOrg} currentProject={currentProject} />
        </div>
      </div>
      {/* Right Section */}
      <div className="border-sidebar-border flex h-full items-center justify-end border-l">
        <div className="flex h-full items-center justify-end">
          <div className="flex h-full items-center px-4">
            <Tooltip message="Get in touch">
              <Button
                type="quaternary"
                theme="borderless"
                size="small"
                className="hover:bg-sidebar-accent h-7 w-7 rounded-lg p-0"
                onClick={() => helpScoutAPI.toggle()}>
                <Icon icon={LifeBuoy} className="text-icon-header size-4" />
              </Button>
            </Tooltip>

            <Tooltip message="Docs">
              <Link to="https://datum.net/docs/" target="_blank" rel="noreferrer">
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  className="hover:bg-sidebar-accent h-7 w-7 rounded-lg p-0">
                  <Icon icon={BookOpen} className="text-icon-header size-4" />
                </Button>
              </Link>
            </Tooltip>

            {/* Task Queue Dropdown */}
            <TaskQueueDropdown />

            {/* Notification Dropdown, polling every 15 minutes */}
            <NotificationDropdown defaultTab="invitation" />
          </div>
          <div className="border-sidebar-border flex h-full items-center justify-center border-l pl-3">
            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};
