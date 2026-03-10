import { NavItem, NavMain } from './nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@datum-ui/components';
import { useEffect } from 'react';

/** Skeleton that mirrors the project nav layout: Home, separator, 6 items, separator, Project Settings */
const ProjectNavSkeleton = () => (
  <ul className="flex h-full w-full min-w-0 flex-col gap-0.5 py-2" data-sidebar="menu">
    {/* Home - first item, mimics active state with subtle background */}
    <SidebarMenu className="px-2">
      <SidebarMenuItem>
        <SidebarMenuSkeleton
          showIcon
          className="bg-sidebar-accent/60 h-8 rounded-xl **:data-[sidebar=menu-skeleton-text]:max-w-12"
        />
      </SidebarMenuItem>
    </SidebarMenu>

    <SidebarSeparator className="my-2" />

    {/* AI Edge, Connectors, DNS, Domains, Metrics, Secrets */}
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <SidebarMenu key={i} className="px-2">
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon className="h-8 rounded-xl" />
        </SidebarMenuItem>
      </SidebarMenu>
    ))}

    <SidebarSeparator className="my-2" />

    {/* Project Settings */}
    <SidebarMenu className="px-2">
      <SidebarMenuItem>
        <SidebarMenuSkeleton
          showIcon
          className="h-8 rounded-xl [&_[data-sidebar=menu-skeleton-text]]:max-w-28"
        />
      </SidebarMenuItem>
    </SidebarMenu>
  </ul>
);

export function AppSidebar({
  navItems,
  title,
  closeOnNavigation,
  defaultOpen,
  currentPath,
  linkComponent,
  loading = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navItems: NavItem[];
  title?: string | React.ReactNode;
  closeOnNavigation?: boolean;
  /** Controls sidebar open state — when false, sidebar closes on mount */
  defaultOpen?: boolean;
  /** Current URL pathname — passed through to NavMain */
  currentPath: string;
  /** Link component — passed through to NavMain (defaults to native `<a>`) */
  linkComponent?: React.ElementType;
  /** Show skeleton instead of nav items while loading */
  loading?: boolean;
}) {
  const { setOpen } = useSidebar();

  useEffect(() => {
    if (defaultOpen === false) {
      setOpen(false);
    }
  }, [defaultOpen, setOpen]);

  return (
    <Sidebar collapsible={props.collapsible ?? 'offcanvas'} {...props}>
      <SidebarContent className="gap-0">
        {title && <SidebarHeader className="px-4 pt-4 pb-0">{title}</SidebarHeader>}

        {loading ? (
          <SidebarGroup className="mb-2 p-0! px-0">
            <SidebarGroupContent className="flex flex-col gap-0 py-0">
              <ProjectNavSkeleton />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          navItems.length > 0 && (
            <NavMain
              className="h-fit py-2"
              items={navItems}
              currentPath={currentPath}
              linkComponent={linkComponent}
              closeOnNavigation={closeOnNavigation}
            />
          )
        )}

        {props.collapsible !== 'none' && (
          <SidebarFooter className="mt-auto p-2">
            <SidebarTrigger />
          </SidebarFooter>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
