import { Header } from './header/header'
import { NavItem } from './sidebar/nav-main'
import { DashboardSidebar } from './sidebar/sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import React from 'react'

export function DashboardLayout({
  children,
  navItems,
  sidebarCollapsible = 'offcanvas',
  currentProject,
}: {
  children: React.ReactNode
  navItems: NavItem[]

  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none'
  currentProject?: IProjectControlResponse
  hideUserDropdown?: boolean
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar navItems={navItems} collapsible={sidebarCollapsible} />
      <SidebarInset>
        <Header currentProject={currentProject} />
        <div className="flex max-w-full flex-1 flex-col gap-4 p-5">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
