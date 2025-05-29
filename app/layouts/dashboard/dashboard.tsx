import { Header } from './header/header';
import { NavItem } from './sidebar/nav-main';
import { DashboardSidebar } from './sidebar/sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { cn } from '@/utils/misc';
import React from 'react';

export function DashboardLayout({
  children,
  navItems,
  sidebarCollapsible = 'offcanvas',
  currentProject,
  className,
}: {
  children: React.ReactNode;
  navItems: NavItem[];

  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  currentProject?: IProjectControlResponse;
  hideUserDropdown?: boolean;
  className?: string;
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar navItems={navItems} collapsible={sidebarCollapsible} />
      <SidebarInset>
        <Header currentProject={currentProject} />
        <div className={cn('flex max-w-full flex-1 flex-col gap-4 p-5', className)}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
