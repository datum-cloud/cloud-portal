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
  headerTitle,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  currentOrg?: IOrganization;
  currentProject?: IProjectControlResponse;
  hideUserDropdown?: boolean;
  className?: string;
  headerTitle?: string;
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar navItems={navItems} collapsible={sidebarCollapsible} />
      <SidebarInset>
        <Header currentProject={currentProject} currentOrg={currentOrg} title={headerTitle} />
        <div className="mx-auto flex h-full w-full flex-1 flex-col gap-6 px-6 py-5">
          {/* <Breadcrumb /> */}
          <div className={cn('flex max-w-full flex-1 flex-col gap-4', className)}>{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
