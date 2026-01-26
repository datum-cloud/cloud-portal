import { ContentWrapper } from '@/components/content-wrapper';
import { Header } from '@/components/header';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { SidebarInset, SidebarProvider, useSidebar } from '@datum-ui/components';
import { AppSidebar, NavItem } from '@datum-ui/components/sidebar';
import { cn } from '@shadcn/lib/utils';
import React, { useLayoutEffect, useState } from 'react';

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
        'h-full transition-opacity duration-75',
        !isReady && 'opacity-0',
        isReady && 'opacity-100'
      )}>
      {hasSubLayout ? (
        children
      ) : (
        <ContentWrapper
          containerClassName={cn('overflow-y-auto scroll-container', containerClassName)}
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
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header at the top - outside sidebar context */}
      <Header currentProject={currentProject} currentOrg={currentOrg} />

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
        <AppSidebar
          title={sidebarHeader as any}
          navItems={navItems}
          collapsible={sidebarCollapsible}
          className="top-[54px]"
          closeOnNavigation={closeOnNavigation}
        />
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
