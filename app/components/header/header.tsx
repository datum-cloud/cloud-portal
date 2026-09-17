import { MobileSwitcherBar } from './mobile-switcher-sheet';
import { OrgProjectSwitcher } from './org-project-switcher';
import { UserDropdown } from './user-dropdown';
import { LogoIcon } from '@/components/logo/logo-icon';
import { MobileMenu } from '@/components/mobile-menu';
import { NotificationDropdown } from '@/components/notification';
import { helpScoutAPI } from '@/modules/helpscout';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { TaskQueueDropdown } from '@datum-cloud/datum-ui/task-queue';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { BookOpen, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router';

export const Header = ({
  currentProject,
  currentOrg,
  switcherLoading = false,
  navItems = [],
  headerContent,
}: {
  currentProject?: Project;
  currentOrg?: Organization;
  switcherLoading?: boolean;
  navItems?: NavItem[];
  /** Optional content rendered between the org/project switcher and the global search entry. */
  headerContent?: React.ReactNode;
}) => {
  return (
    <div className="bg-background sticky top-0 z-50 flex flex-col">
      {/* Chromium WCO: native title bar is gone; this strip paints `--background`
          into that space. Height is 0px when overlay is not active. */}
      <div
        aria-hidden
        className="pwa-drag bg-background w-full shrink-0"
        style={{
          height: 'max(env(titlebar-area-height, 0px), env(safe-area-inset-top, 0px))',
        }}
      />
      <header className="pwa-drag bg-background border-sidebar-border flex h-12 w-full shrink-0 touch-none items-center justify-between gap-4 border-b px-4">
        {/* Left Section */}
        <div className="pwa-no-drag flex flex-1 items-center gap-3">
          {/* Mobile hamburger — skeleton while loading, button when ready */}
          {navItems.length > 0 ? (
            <MobileMenu navItems={navItems} />
          ) : (
            switcherLoading && (
              <Skeleton className="h-7 w-7 shrink-0 rounded-md md:hidden" aria-hidden />
            )
          )}

          <Link
            to={paths.account.root}
            className="flex shrink-0 items-center justify-center md:mr-3">
            <LogoIcon width={21} />
          </Link>

          {/* Desktop/Tablet: popover switchers */}
          <div className="hidden md:block">
            <OrgProjectSwitcher
              currentOrg={currentOrg}
              currentProject={currentProject}
              switcherLoading={switcherLoading}
            />
          </div>
        </div>
        {/* Right Section */}
        <div className="pwa-no-drag border-sidebar-border flex h-full items-center justify-end">
          {headerContent}
          <div className="flex h-full items-center justify-end border-l">
            <div className="flex h-full items-center px-4">
              <Tooltip message="Get in touch">
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  className="hover:bg-sidebar-accent h-7 w-7 rounded-lg p-0"
                  onClick={() => helpScoutAPI.toggle()}
                  aria-label="Get in touch">
                  <Icon icon={LifeBuoy} className="text-icon-header size-4" />
                </Button>
              </Tooltip>

              <Tooltip message="Docs">
                <Link
                  to="https://datum.net/docs/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Documentation">
                  <Button
                    type="quaternary"
                    theme="borderless"
                    size="small"
                    className="hover:bg-sidebar-accent h-7 w-7 rounded-lg p-0"
                    tabIndex={-1}>
                    <Icon icon={BookOpen} className="text-icon-header size-4" />
                  </Button>
                </Link>
              </Tooltip>

              {/* Task Queue Dropdown */}
              <TaskQueueDropdown />

              {/* Notification Dropdown */}
              <NotificationDropdown defaultTab="invitation" />
            </div>
            <div className="border-sidebar-border flex h-full items-center justify-center border-l pl-3">
              <UserDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile: sub-bar with org/project switchers */}
      <MobileSwitcherBar
        currentOrg={currentOrg}
        currentProject={currentProject}
        switcherLoading={switcherLoading}
      />
    </div>
  );
};
