import { ContentWrapper } from '@/components/content-wrapper';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { SidebarInset, SidebarProvider, useSidebar } from '@datum-ui/components';
import { Header } from '@datum-ui/components/header/header';
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
        'transition-opacity duration-75',
        !isReady && 'opacity-0',
        isReady && 'opacity-100'
      )}>
      <ContentWrapper
        containerClassName={cn(!hasSubLayout && 'gap-6 overflow-auto p-9', containerClassName)}
        contentClassName={cn(!hasSubLayout && 'gap-4', contentClassName)}>
        {!hasSubLayout && <>{/* <Breadcrumb /> - Future implementation */}</>}
        {children}
      </ContentWrapper>
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
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  currentOrg?: IOrganization;
  currentProject?: IProjectControlResponse;
  contentClassName?: string;
  sidebarHeader?: string | React.ReactNode;
  containerClassName?: string;
  expandBehavior?: 'push' | 'overlay';
  showBackdrop?: boolean;
}) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header at the top - outside sidebar context */}
      <Header currentProject={currentProject} currentOrg={currentOrg} />

      {/* Sidebar + Content area below header */}
      <SidebarProvider
        defaultOpen={sidebarCollapsible === 'offcanvas'}
        expandOnHover={sidebarCollapsible === 'icon'}
        expandBehavior={expandBehavior}
        showBackdrop={showBackdrop}
        className="flex-1 overflow-hidden"
        style={
          {
            '--sidebar-width': '15.875rem', // Custom desktop width
            '--sidebar-width-icon': '3rem', // Custom desktop width
            '--sidebar-width-mobile': '18.75rem', // Custom desktop width
          } as React.CSSProperties
        }>
        <AppSidebar
          title={sidebarHeader as any}
          navItems={navItems}
          collapsible={sidebarCollapsible}
          className="top-[54px] h-[calc(100vh-54px)]"
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
