import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'
import { DashboardSidebar } from './sidebar/sidebar'
import { NavItem } from './sidebar/nav-main'
import { Header } from './header/header'

export function DashboardLayout({
  children,
  navItems,
  sidebarHeader,
  headerContent,
  sidebarCollapsible = 'offcanvas',
}: {
  children: React.ReactNode
  navItems: NavItem[]
  sidebarHeader?: React.ReactNode
  headerContent?: React.ReactNode
  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none'
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar
        navItems={navItems}
        sidebarHeader={sidebarHeader}
        collapsible={sidebarCollapsible}
      />
      <SidebarInset>
        <Header content={headerContent} />
        <div className="flex flex-1 flex-col gap-4 p-5">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
