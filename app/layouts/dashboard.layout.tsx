import { ContentWrapper } from '@/components/content-wrapper';
import { Header } from '@/components/header';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { SidebarInset, SidebarProvider, useSidebar } from '@datum-ui/components';
import { AppSidebar, NavItem } from '@datum-ui/components/sidebar';
import { cn } from '@shadcn/lib/utils';
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
        'h-full min-w-0 transition-opacity duration-75',
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
          <AppSidebar
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
        <SidebarInset className="min-h-0">
          <DashboardContent
            containerClassName={containerClassName}
            contentClassName={contentClassName}>
            {children}
          </DashboardContent>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
