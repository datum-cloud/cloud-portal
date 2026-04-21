import { LogoFlat } from '@/components/logo/logo-flat';
import { NavItem, NavMenu } from '@datum-cloud/datum-ui/app-navigation';
import { Button } from '@datum-cloud/datum-ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@datum-cloud/datum-ui/sheet';
import { SidebarProvider } from '@datum-cloud/datum-ui/sidebar';
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
    <SidebarProvider defaultOpen={true} className="!min-h-0">
      <NavMenu
        className="h-fit py-2 [&_[data-sidebar=menu]]:!px-2"
        items={navItems}
        closeOnNavigation
        currentPath={pathname}
        linkComponent={Link}
        disableTooltip
      />
    </SidebarProvider>
  );
};

export function MobileMenu({ navItems }: { navItems: NavItem[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex shrink-0 items-center md:hidden">
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
          className="bg-background border-sidebar-border h-svh w-75 max-w-[85vw] gap-0 border-r p-0">
          <div className="border-sidebar-border flex h-12 shrink-0 items-center border-b px-4">
            <LogoFlat className="h-4 w-auto" />
          </div>
          <div className="flex flex-col overflow-y-auto">
            <MobileNavSheetContent navItems={navItems} onClose={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
