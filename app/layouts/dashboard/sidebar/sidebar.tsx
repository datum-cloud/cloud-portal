import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavItem, NavMain } from './nav-main'
import { HomeIcon, LibraryIcon, SparklesIcon } from 'lucide-react'
import { routes } from '@/constants/routes'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { Logo } from '@/components/logo/logo'
import { useTheme } from '@/hooks/useTheme'
const defaultNav: NavItem[] = [
  {
    title: 'Ask AI',
    href: routes.org.askAi,
    type: 'link',
    icon: SparklesIcon,
  },
  {
    title: 'Home',
    href: routes.org.root,
    type: 'link',
    icon: HomeIcon,
  },
  {
    title: 'Docs',
    href: routes.org.docs,
    type: 'link',
    icon: LibraryIcon,
  },
]

export function DashboardSidebar({
  navItems,
  sidebarHeader,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navItems: NavItem[]
  sidebarHeader?: React.ReactNode
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

  return (
    <Sidebar collapsible={props.collapsible ?? 'offcanvas'} {...props}>
      <SidebarHeader className="flex flex-col gap-2 px-4 pb-2 pt-4">
        {sidebarHeader ? (
          sidebarHeader
        ) : (
          <Logo
            asIcon={state === 'collapsed'}
            width={state === 'collapsed' ? 30 : 100}
            theme={theme}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={[...defaultNav, ...navItems]} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
