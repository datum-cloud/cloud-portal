import { Breadcrumb } from './header/breadcrumb';
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
  headerTitle,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  currentProject?: IProjectControlResponse;
  hideUserDropdown?: boolean;
  className?: string;
  headerTitle?: string;
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar navItems={navItems} collapsible={sidebarCollapsible} />
      <SidebarInset>
        <Header currentProject={currentProject} title={headerTitle} />
        <div className="mx-auto flex h-full w-full max-w-(--breakpoint-xl) flex-1 flex-col gap-6 px-4 py-5">
          <Breadcrumb />
          <div className={cn('flex max-w-full flex-1 flex-col gap-4', className)}>{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
