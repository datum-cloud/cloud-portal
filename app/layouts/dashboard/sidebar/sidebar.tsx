import { NavItem, NavMain } from './nav-main';
import { LogoIcon } from '@/components/logo/logo-icon';
import { LogoText } from '@/components/logo/logo-text';
import { paths } from '@/utils/config/paths.config';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';

export function DashboardSidebar({
  navItems,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navItems: NavItem[];
}) {
  const { setOpen, open, state } = useSidebar();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sidebar = searchParams.get('sidebar');

    if (sidebar === 'false') {
      setOpen(false);
    }
  }, [searchParams]);

  return (
    <Sidebar collapsible={props.collapsible ?? 'offcanvas'} {...props}>
      <SidebarHeader className="flex h-12 flex-col justify-center px-4">
        <Link to={paths.account.root} className="flex items-center gap-2">
          <LogoIcon
            width={20}
            className={cn('transition-transform duration-500', !open && 'rotate-[360deg]')}
          />
          {state === 'expanded' && <LogoText className="transition-opacity duration-500" />}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
