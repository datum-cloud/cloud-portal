import { SubLayoutProps } from './sub.types';
import { ContentWrapper } from '@/components/content-wrapper';
import { SubNavigationTabs, type SubNavigationTab } from '@/components/sub-navigation';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { type NavItem, NavMenu } from '@datum-cloud/datum-ui/app-navigation';
import { useSidebar } from '@datum-cloud/datum-ui/sidebar';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLayoutEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router';

function toSubNavTabs(navItems: NavItem[]): SubNavigationTab[] {
  return navItems
    .filter((item) => item.href != null)
    .map((item) => ({
      label: item.title,
      href: item.href!,
      icon: item.icon,
      hidden: item.hidden,
    }));
}

export function SubLayout({
  children,
  navItems,
  sidebarHeader,
  className,
  containerClassName,
  contentClassName,
}: SubLayoutProps) {
  const { setHasSubLayout } = useSidebar();
  const { pathname } = useLocation();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';
  const subNavTabs = useMemo(() => toSubNavTabs(navItems), [navItems]);

  // Always register SubLayout — it handles its own ContentWrapper for all breakpoints.
  // This prevents DashboardLayout from wrapping content in a second ContentWrapper,
  // and avoids hydration-triggered remount loops when isDesktop flips from SSR default.
  useLayoutEffect(() => {
    setHasSubLayout(true);
    return () => setHasSubLayout(false);
  }, [setHasSubLayout]);

  // Mobile/Tablet: horizontal tabs above content, stacked vertically
  if (!isDesktop) {
    return (
      <div className={cn('flex h-full w-full flex-col', className)}>
        <div className="border-sidebar-border border-b">
          <SubNavigationTabs tabs={subNavTabs} containerClassName="px-3.5" />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <ContentWrapper
            containerClassName={cn('overflow-y-auto', containerClassName)}
            contentClassName={contentClassName}>
            {children}
          </ContentWrapper>
        </main>
      </div>
    );
  }

  // Desktop: inner sidebar + content side by side
  return (
    <div className={cn('flex h-full w-full flex-row', className)}>
      <aside
        className={cn(
          'bg-sidebar border-sidebar-border shrink-0 overflow-y-auto px-3.5 py-5',
          'h-full w-51 border-r'
        )}>
        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden">
          <div className="flex flex-1 flex-col items-start justify-start">
            <div className="flex flex-col">
              {sidebarHeader && <div className="px-2 pb-0">{sidebarHeader}</div>}
              <NavMenu
                items={navItems}
                className="px-0 py-3.5"
                itemClassName="text-xs h-6"
                disableTooltip
                currentPath={pathname}
                linkComponent={Link}
              />
            </div>
          </div>
        </div>
      </aside>
      <main className="h-full min-h-0 flex-1 overflow-y-auto">
        <ContentWrapper
          containerClassName={cn('overflow-y-auto', containerClassName)}
          contentClassName={contentClassName}>
          {children}
        </ContentWrapper>
      </main>
    </div>
  );
}
