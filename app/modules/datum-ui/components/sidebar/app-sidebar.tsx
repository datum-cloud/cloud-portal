import { NavItem, NavMain } from './nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@datum-ui/components';
import { useEffect } from 'react';

export function AppSidebar({
  navItems,
  title,
  closeOnNavigation,
  defaultOpen,
  currentPath,
  linkComponent,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navItems: NavItem[];
  title?: string | React.ReactNode;
  closeOnNavigation?: boolean;
  /** Controls sidebar open state — when false, sidebar closes on mount */
  defaultOpen?: boolean;
  /** Current URL pathname — passed through to NavMain */
  currentPath: string;
  /** Link component — passed through to NavMain (defaults to native `<a>`) */
  linkComponent?: React.ElementType;
}) {
  const { setOpen } = useSidebar();

  useEffect(() => {
    if (defaultOpen === false) {
      setOpen(false);
    }
  }, [defaultOpen, setOpen]);

  return (
    <Sidebar collapsible={props.collapsible ?? 'offcanvas'} {...props}>
      <SidebarContent className="gap-0">
        {title && <SidebarHeader className="px-4 pt-4 pb-0">{title}</SidebarHeader>}

        {navItems.length > 0 && (
          <NavMain
            className="h-fit py-2"
            items={navItems}
            currentPath={currentPath}
            linkComponent={linkComponent}
            closeOnNavigation={closeOnNavigation}
          />
        )}

        {props.collapsible !== 'none' && (
          <SidebarFooter className="mt-auto p-2">
            <SidebarTrigger />
          </SidebarFooter>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
