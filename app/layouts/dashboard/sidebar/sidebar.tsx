import { NavItem, NavMain } from './nav-main'
import { LogoIcon } from '@/components/logo/logo-icon'
import { LogoText } from '@/components/logo/logo-text'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { routes } from '@/constants/routes'
import { cn } from '@/utils/misc'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'

export function DashboardSidebar({
  navItems,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navItems: NavItem[]
}) {
  const { setOpen, open, state } = useSidebar()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const sidebar = searchParams.get('sidebar')

    if (sidebar === 'false') {
      setOpen(false)
    }
  }, [searchParams])

  return (
    <Sidebar collapsible={props.collapsible ?? 'offcanvas'} {...props}>
      <SidebarHeader className="flex h-16 flex-col justify-center px-4 py-2">
        <Link to={routes.account.root} className="flex items-center gap-2">
          <LogoIcon
            width={24}
            className={cn(
              'transition-transform duration-500',
              !open && 'rotate-[360deg]',
            )}
          />
          {state === 'expanded' && (
            <LogoText width={55} className="transition-opacity duration-500" />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} className="pt-0" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
