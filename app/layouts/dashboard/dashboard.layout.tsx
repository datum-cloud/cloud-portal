import { NavItem } from './sidebar/nav-main';
import { DashboardSidebar } from './sidebar/sidebar';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { SidebarInset, SidebarProvider } from '@datum-ui/components';
import { Header } from '@datum-ui/components/header/header';
import { cn } from '@shadcn/lib/utils';
import React from 'react';

export function DashboardLayout({
  children,
  navItems,
  sidebarCollapsible = 'icon',
  currentOrg,
  currentProject,
  contentClassName,
  sidebarHeader,
  containerClassName,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  currentOrg?: IOrganization;
  currentProject?: IProjectControlResponse;
  contentClassName?: string;
  sidebarHeader?: string | React.ReactNode;
  containerClassName?: string;
}) {
  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header at the top - outside sidebar context */}
      <Header currentProject={currentProject} currentOrg={currentOrg} />

      {/* Sidebar + Content area below header */}
      <SidebarProvider
        defaultOpen={sidebarCollapsible === 'offcanvas'}
        expandOnHover={sidebarCollapsible === 'icon'}
        className="flex-1 overflow-hidden"
        style={
          {
            '--sidebar-width': '15.875rem', // Custom desktop width
            '--sidebar-width-icon': '3rem', // Custom desktop width
            '--sidebar-width-mobile': '18.75rem', // Custom desktop width
          } as React.CSSProperties
        }>
        <DashboardSidebar
          title={sidebarHeader as any}
          navItems={navItems}
          collapsible={sidebarCollapsible}
          className="top-[54px] h-[calc(100vh-54px)]"
        />
        <SidebarInset>
          <div
            className={cn(
              'mx-auto flex h-full w-full flex-1 flex-col gap-6 p-9',
              containerClassName ?? ''
            )}>
            {/* <Breadcrumb /> */}
            <div className={cn('flex max-w-full flex-1 flex-col gap-4', contentClassName ?? '')}>
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
