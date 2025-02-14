import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavItem, NavMain } from './nav-main'
import { HomeIcon } from 'lucide-react'
import { routes } from '@/constants/routes'
import { useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router'
import { Logo } from '@/components/logo/logo'
import { useTheme } from '@/hooks/useTheme'

export function DashboardSidebar({
  navItems,
  sidebarHeader,
  homeLink,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navItems: NavItem[]
  sidebarHeader?: React.ReactNode
  homeLink?: string
}) {
  const theme = useTheme()
  const { setOpen, state } = useSidebar()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const sidebar = searchParams.get('sidebar')

    if (sidebar === 'false') {
      setOpen(false)
    }
  }, [searchParams])

  const navs: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Home',
        href: homeLink ?? routes.org.root,
        type: 'link',
        icon: HomeIcon,
      },
      /*  {
        title: 'Docs',
        href: 'https://docs.datum.net/',
        type: 'externalLink',
        icon: LibraryIcon,
      }, */
      ...navItems,
    ]
  }, [homeLink])

  return (
    <Sidebar collapsible={props.collapsible ?? 'offcanvas'} {...props}>
      <SidebarHeader className="flex flex-col gap-2 px-4 pb-2 pt-4">
        <Link to={routes.home}>
          <Logo
            asIcon={state === 'collapsed'}
            width={state === 'collapsed' ? 16 : 100}
            theme={theme}
          />
        </Link>
        {sidebarHeader}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navs} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
