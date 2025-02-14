import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import React, { useMemo } from 'react'
import { DashboardSidebar } from './sidebar/sidebar'
import { NavItem } from './sidebar/nav-main'
import { Header } from './header/header'
import { useMatches } from 'react-router'
import { BreadcrumbMatch, Breadcrumb } from './header/breadcrumb'
export function DashboardLayout({
  children,
  navItems,
  sidebarHeader,
  headerContent,
  sidebarCollapsible = 'offcanvas',
  homeLink,
}: {
  children: React.ReactNode
  navItems: NavItem[]
  sidebarHeader?: React.ReactNode
  headerContent?: React.ReactNode
  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none'
  homeLink?: string
}) {
  const matches = useMatches() as unknown as BreadcrumbMatch[]
  const breadcrumbs = useMemo(
    () => matches.filter((match) => match.handle && match.handle.breadcrumb),
    [matches],
  )

  return (
    <SidebarProvider>
      <DashboardSidebar
        navItems={navItems}
        sidebarHeader={sidebarHeader}
        collapsible={sidebarCollapsible}
        homeLink={homeLink}
      />
      <SidebarInset>
        <Header content={headerContent} />
        <div className="flex flex-1 flex-col gap-4 p-5">
          {breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
