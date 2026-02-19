import { ContentWrapper } from '@/components/content-wrapper';
import { Header } from '@/components/header';
import { MobileMenu } from '@/components/mobile-menu';
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
}) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden overscroll-none">
      {/* Header at the top - outside sidebar context */}
      <Header currentProject={currentProject} currentOrg={currentOrg} />

      {/* Mobile menu */}
      {navItems.length > 0 && (
        <MobileMenu navItems={navItems} currentOrg={currentOrg} currentProject={currentProject} />
      )}

      {/* Sidebar + Content area below header */}
      <SidebarProvider
        defaultOpen={true}
        expandOnHover={false}
        expandBehavior={expandBehavior}
        showBackdrop={showBackdrop}
        className="max-h-[calc(100vh-54px)] min-h-0 flex-1 overflow-hidden"
        style={
          {
            '--sidebar-width': '12.75rem', // Custom desktop width
            '--sidebar-width-icon': '3rem', // Custom desktop width
            '--sidebar-width-mobile': '18.75rem', // Custom desktop width
          } as React.CSSProperties
        }>
        {(navItems.length > 0 || sidebarHeader != null) && (
          <AppSidebar
            title={sidebarHeader as any}
            navItems={navItems}
            collapsible={sidebarCollapsible}
            className="top-12"
            closeOnNavigation={closeOnNavigation}
            currentPath={pathname}
            linkComponent={Link}
            defaultOpen={searchParams.get('sidebar') !== 'false'}
          />
        )}
        <SidebarInset>
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
