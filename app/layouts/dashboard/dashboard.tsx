import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'
import { DashboardSidebar } from './sidebar/sidebar'
import { NavItem } from './sidebar/nav-main'
import { Header } from './header/header'

export function DashboardLayout({
  children,
  navItems,
  sidebarHeader,
}: {
  children: React.ReactNode
  navItems: NavItem[]
  sidebarHeader?: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar navItems={navItems} sidebarHeader={sidebarHeader} />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-5">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
