import { Header } from '../header/header';
import { AppSidebar } from './app-sidebar/app-sidebar';
import { NavItem } from './app-sidebar/nav-main';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/utils/helpers/misc.helper';
import React from 'react';
import { Breadcrumb } from '../header/breadcrumb';

export function SidebarContainer({
  children,
  navItems,
  className,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  className?: string;
}) {
  return (
    <SidebarProvider>
      <AppSidebar navItems={navItems} collapsible="icon" />
      <SidebarInset>
        <Header />
        <Breadcrumb />
        <div className={cn('flex max-w-full flex-1 flex-col gap-4 p-5', className)}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
