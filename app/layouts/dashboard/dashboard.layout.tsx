import { Header } from './header/header';
import { NavItem } from './sidebar/nav-main';
import { DashboardSidebar } from './sidebar/sidebar';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { SidebarInset, SidebarProvider } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import React from 'react';

export function DashboardLayout({
  children,
  navItems,
  sidebarCollapsible = 'offcanvas',
  currentOrg,
  currentProject,
  className,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  currentOrg?: IOrganization;
  currentProject?: IProjectControlResponse;
  hideUserDropdown?: boolean;
  className?: string;
}) {
  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header at the top - outside sidebar context */}
      <Header currentProject={currentProject} currentOrg={currentOrg} />

      {/* Sidebar + Content area below header */}
      <SidebarProvider className="flex-1 overflow-hidden">
        <DashboardSidebar navItems={navItems} collapsible={sidebarCollapsible} />
        <SidebarInset>
          <div className="mx-auto flex h-full w-full flex-1 flex-col gap-6 px-6 py-5">
            {/* <Breadcrumb /> */}
            <div className={cn('flex max-w-full flex-1 flex-col gap-4', className)}>{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
