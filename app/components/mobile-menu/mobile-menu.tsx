import { OrgProjectSwitcher } from '@/components/header';
import { LogoIcon } from '@/components/logo/logo-icon';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { Button, Sheet, SheetContent, SheetTrigger, SidebarProvider } from '@datum-ui/components';
import { NavItem, NavMain } from '@datum-ui/components/sidebar';
import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';

const MenuIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden>
    <path
      d="M2.66699 3.33301H13.3337"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.66699 8H13.3337"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.66699 12.667H10.0003"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Renders sidebar nav inside the sheet. Closes the sheet when the user navigates.
 */
const MobileNavSheetContent = ({
  navItems,
  onClose,
}: {
  navItems: NavItem[];
  onClose: () => void;
}) => {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  return (
    <SidebarProvider defaultOpen={true} className="h-full">
      <NavMain
        className="h-fit py-2"
        items={navItems}
        closeOnNavigation
        currentPath={pathname}
        linkComponent={Link}
      />
    </SidebarProvider>
  );
};

export function MobileMenu({
  navItems,
  currentOrg,
  currentProject,
}: {
  navItems: NavItem[];
  currentOrg?: Organization;
  currentProject?: Project;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="bg-background border-sidebar-border sticky top-0 z-50 flex h-12 w-full max-w-screen shrink-0 items-center border-b px-4 md:hidden">
      <div className="flex shrink-0 items-center pr-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              type="quaternary"
              theme="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label="Open navigation menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="left"
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="bg-background border-sidebar-border h-fit min-h-svh w-75 max-w-[85vw] gap-0 overflow-y-hidden border-r p-0 pt-10">
            <Link to={paths.account.root} className="absolute top-4 left-4 mb-4 flex">
              <LogoIcon width={21} />
            </Link>

            <div className="flex h-full flex-col overflow-y-auto pt-4">
              <MobileNavSheetContent navItems={navItems} onClose={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="scrollbar-hide min-w-0 flex-1 overflow-x-auto">
        <OrgProjectSwitcher currentOrg={currentOrg} currentProject={currentProject} />
      </div>
    </div>
  );
}
