import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'
import { DashboardSidebar } from './sidebar/sidebar'
import { NavItem } from './sidebar/nav-main'
import { Header } from './header/header'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'

export function DashboardLayout({
  children,
  navItems,
  sidebarCollapsible = 'offcanvas',
  homeLink,
  currentProject,
}: {
  children: React.ReactNode
  navItems: NavItem[]

  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none'
  homeLink?: string
  currentProject?: IProjectControlResponse
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar
        navItems={navItems}
        collapsible={sidebarCollapsible}
        homeLink={homeLink}
      />
      <SidebarInset>
        <Header currentProject={currentProject} />
        <div className="flex flex-1 flex-col gap-4 p-5">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
