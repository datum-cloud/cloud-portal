import { ContentWrapper } from '@/components/content-wrapper';
import { Header } from '@/components/header';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { AppNavigation, NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { SidebarInset, SidebarProvider, useSidebar } from '@datum-cloud/datum-ui/sidebar';
import { cn } from '@datum-cloud/datum-ui/utils';
import React, { useLayoutEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';

/**
 * Internal component that handles dashboard-specific logic
 * Must be used inside SidebarProvider to access useSidebar hook
 */
const DashboardContent = ({
  children,
  containerClassName,
  contentClassName,
}: {
  children: React.ReactNode;
  containerClassName?: string;
  contentClassName?: string;
}) => {
  const { hasSubLayout } = useSidebar();
  const [isReady, setIsReady] = useState(false);

  // Mark as ready after first layout to prevent flash
  useLayoutEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <div
      className={cn(
        'min-h-0 min-w-0 flex-1 transition-opacity duration-75',
        !isReady && 'opacity-0',
        isReady && 'opacity-100'
      )}>
      {hasSubLayout ? (
        children
      ) : (
        <ContentWrapper
          containerClassName={cn('overflow-y-auto', containerClassName)}
          contentClassName={cn('gap-4', contentClassName)}>
          {children}
        </ContentWrapper>
      )}
    </div>
  );
};

export function DashboardLayout({
  children,
  navItems,
  sidebarCollapsible = 'icon',
  currentOrg,
  currentProject,
  contentClassName,
  sidebarHeader,
  containerClassName,
  expandBehavior = 'push',
  showBackdrop = false,
  closeOnNavigation = false,
  sidebarLoading = false,
  switcherLoading = false,
  bottomBar,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  currentOrg?: Organization;
  currentProject?: Project;
  contentClassName?: string;
  sidebarHeader?: string | React.ReactNode;
  containerClassName?: string;
  expandBehavior?: 'push' | 'overlay';
  showBackdrop?: boolean;
  closeOnNavigation?: boolean;
  /** Show skeleton in sidebar while loading */
  sidebarLoading?: boolean;
  /** Show skeleton in org/project switchers while loading (prevents layout shift) */
  switcherLoading?: boolean;
  /** Optional bar rendered at the bottom of the layout */
  bottomBar?: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const breakpoint = useBreakpoint();
  const isTablet = breakpoint === 'tablet';

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden">
      {/* Header with integrated mobile hamburger */}
      <Header
        currentProject={currentProject}
        currentOrg={currentOrg}
        switcherLoading={switcherLoading}
        navItems={navItems}
      />

      {/* Sidebar + Content area below header - flex-1 min-h-0 so only this area scrolls on mobile */}
      <SidebarProvider
        defaultOpen={!isTablet}
        expandOnHover={isTablet}
        expandBehavior={expandBehavior}
        showBackdrop={showBackdrop}
        className="flex min-h-0 flex-1 overflow-hidden"
        style={
          {
            '--sidebar-width': '12.75rem',
            '--sidebar-width-icon': '3rem',
            '--sidebar-width-mobile': '18.75rem',
          } as React.CSSProperties
        }>
        {(navItems.length > 0 || sidebarHeader != null || sidebarLoading) && (
          <AppNavigation
            title={sidebarHeader as any}
            navItems={navItems}
            collapsible={sidebarCollapsible}
            className="top-12"
            closeOnNavigation={closeOnNavigation}
            currentPath={pathname}
            linkComponent={Link}
            defaultOpen={searchParams.get('sidebar') !== 'false'}
            loading={sidebarLoading}
          />
        )}
        <SidebarInset className="flex min-h-0 flex-col">
          <DashboardContent
            containerClassName={containerClassName}
            contentClassName={contentClassName}>
            {children}
          </DashboardContent>
          {bottomBar}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
