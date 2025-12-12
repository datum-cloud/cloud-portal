import { NavItem, NavMain } from './nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@datum-ui/components';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

export function AppSidebar({
  navItems,
  title,
  closeOnNavigation,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navItems: NavItem[];
  title?: string | React.ReactNode;
  closeOnNavigation?: boolean;
}) {
  const { setOpen } = useSidebar();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sidebar = searchParams.get('sidebar');

    if (sidebar === 'false') {
      setOpen(false);
    }
  }, [searchParams]);

  return (
    <Sidebar collapsible={props.collapsible ?? 'offcanvas'} {...props}>
      <SidebarContent className="gap-0">
        {title && <SidebarHeader className="px-4 pt-4 pb-0">{title}</SidebarHeader>}

        {navItems.length > 0 && (
          <NavMain className="py-2" items={navItems} closeOnNavigation={closeOnNavigation} />
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
