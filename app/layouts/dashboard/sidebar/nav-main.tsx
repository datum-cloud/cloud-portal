import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/utils/misc';
import { ChevronRight, ExternalLinkIcon, LucideIcon } from 'lucide-react';
import { ComponentProps, Fragment, forwardRef, useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router';

export type NavItem = {
  title: string;
  href: string | null;
  type: 'link' | 'group' | 'collapsible' | 'externalLink';
  disabled?: boolean;
  count?: number;
  icon?: LucideIcon;
  children?: NavItem[];
  open?: boolean;
  hidden?: boolean;
};
export const NavMain = forwardRef<HTMLUListElement, ComponentProps<'ul'> & { items: NavItem[] }>(
  ({ className, items, ...props }, ref) => {
    const { pathname } = useLocation();
    const { state, isMobile } = useSidebar();
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

    const activeNavItem = useCallback(
      (val: string) => {
        // pathname is from useLocation() in the outer scope.
        // val is the nav item's path string.

        const normalize = (p: string): string => {
          let result = p.startsWith('/') ? p : `/${p}`;
          // Remove trailing slash, unless it's the root path itself
          if (result !== '/' && result.endsWith('/')) {
            result = result.slice(0, -1);
          }
          return result;
        };

        const cleanCurrentPath = normalize(pathname);
        const cleanNavPath = normalize(val);

        // Handle root path case: nav item is '/'
        if (cleanNavPath === '/') {
          return cleanCurrentPath === '/'; // Active if current path is also root
        }

        // Check for exact match or if current path is a sub-path of nav item path
        // e.g., current: /settings/profile, nav: /settings -> true (startsWith /settings/)
        // e.g., current: /settings, nav: /settings -> true (exact match)
        return cleanCurrentPath === cleanNavPath || cleanCurrentPath.startsWith(`${cleanNavPath}/`);
      },
      [pathname]
    );

    const toggleItem = (itemId: string) => {
      setOpenItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const renderNavItem = (item: NavItem, level = 0) => {
      if ('hidden' in item && item.hidden) {
        return null;
      }

      const itemKey = `${item.title}-${item.href || ''}-${level}`;

      if ('type' in item && item.type === 'group') {
        return (
          <Fragment key={itemKey}>
            <SidebarGroup className="mb-2 p-0!">
              {item.title && (
                <SidebarGroupLabel className="lowercase group-data-[state=collapsed]:hidden first-letter:uppercase">
                  {item.title}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent className="flex flex-col gap-1">
                {(item.children || []).map((child) => renderNavItem(child, level + 1))}
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator className="hidden group-data-[state=collapsed]:block" />
          </Fragment>
        );
      }

      const isActive = activeNavItem(item.href as string);
      const pathnameExistInDropdowns =
        item.children?.filter((dropdownItem: NavItem) =>
          pathname.includes(dropdownItem.href as string)
        ) || [];

      const hasChildren = (item.children || []).length > 0;
      const isOpen = openItems[item.href as string] || Boolean(pathnameExistInDropdowns.length);
      const hasActiveChild = pathnameExistInDropdowns.length > 0;

      // Handle collapsed state with dropdowns (for levels 0-2)
      if (state === 'collapsed' && !isMobile && level <= 2 && hasChildren) {
        return (
          <SidebarMenu key={itemKey}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive || hasActiveChild}
                  disabled={item.disabled}
                  className={cn(
                    item.disabled && 'pointer-events-none opacity-50',
                    'data-[active=true]:text-primary h-9 font-medium transition-all data-[active=true]:font-semibold'
                  )}>
                  {item.icon && <item.icon />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {item.children?.map((subItem) => {
                    const hasSubChildren = (subItem.children || []).length > 0;
                    const isSubItemActive = activeNavItem(subItem.href as string);

                    if (hasSubChildren) {
                      const hasActiveSubChild = subItem.children?.some((thirdLevelItem) =>
                        activeNavItem(thirdLevelItem.href as string)
                      );

                      return (
                        <DropdownMenu key={`collapsed-item-${subItem.title}-${level}`}>
                          <DropdownMenuTrigger asChild className="w-full">
                            <DropdownMenuItem
                              className={cn(
                                'cursor-default',
                                (isSubItemActive || hasActiveSubChild) &&
                                  'bg-primary/10 text-primary'
                              )}>
                              <span>{subItem.title}</span>
                              <ChevronRight className="ml-auto size-4" />
                            </DropdownMenuItem>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuLabel>{subItem.title}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              {subItem.children?.map((thirdLevelItem) => {
                                const isThirdLevelActive = activeNavItem(
                                  thirdLevelItem.href as string
                                );

                                return (
                                  <DropdownMenuItem
                                    key={`collapsed-item-drop-down-${thirdLevelItem.title}-${level}`}
                                    className={cn(
                                      isThirdLevelActive && 'bg-primary/10 text-primary'
                                    )}>
                                    <Link to={thirdLevelItem.href || ''} className="flex w-full">
                                      <span>{thirdLevelItem.title}</span>
                                    </Link>
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    }

                    return (
                      <DropdownMenuItem
                        key={`collapsed-item-drop-down-${subItem.title}-${level}`}
                        className={cn(isSubItemActive && 'bg-primary/10 text-primary')}>
                        <Link to={subItem.href || ''} className="flex w-full items-center">
                          <span>{subItem.title}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenu>
        );
      }

      // Handle expanded state with collapsible menus (for levels 0-3)
      if (hasChildren && level <= 3) {
        return (
          <SidebarMenu key={itemKey}>
            <Collapsible
              key={`collapsed-item-drop-down-item-${item.title}-${level}`}
              asChild
              defaultOpen={isOpen}
              className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild className="w-full">
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive || hasActiveChild}
                    disabled={item.disabled}
                    className={cn(
                      item.disabled && 'pointer-events-none opacity-50',
                      'data-[active=true]:text-primary h-9 font-medium transition-all data-[active=true]:font-semibold'
                    )}>
                    {item?.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub
                    className={cn(
                      level >= 1 ? 'mr-0 pr-[.1rem]' : '',
                      level === 2 ? 'pl-4' : '',
                      level === 3 ? 'pl-6' : ''
                    )}>
                    {item.children?.map((subItem) => renderNavItem(subItem, level + 1))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        );
      }

      const renderCollapsible = (currentItem: NavItem, currentLevel: number) => (
        <Collapsible
          key={`collapsed-item-drop-down-item-${currentItem.title}-${currentLevel}`}
          asChild
          defaultOpen={isOpen}
          className="group/collapsible">
          <SidebarMenuItem key={`collapsible-sidebar-${currentItem.title}-${currentLevel}`}>
            <CollapsibleTrigger asChild className="w-full">
              <SidebarMenuButton
                tooltip={currentItem.title}
                disabled={currentItem.disabled}
                className={cn(
                  currentItem.disabled && 'pointer-events-none opacity-50',
                  'data-[active=true]:text-primary h-9 font-medium transition-all data-[active=true]:font-semibold'
                )}>
                {currentItem?.icon && <currentItem.icon />}
                <span>{currentItem.title}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub className={currentLevel >= 1 ? 'mr-0 pr-[.1rem]' : ''}>
                {currentItem.children?.map((subItem) => renderNavItem(subItem, currentLevel + 1))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );

      if (level <= 2 && hasChildren) {
        return <SidebarMenu key={itemKey}>{renderCollapsible(item, level)}</SidebarMenu>;
      }

      return (
        <SidebarMenu key={itemKey} className={cn(`level_${level}`)}>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              isActive={isActive && !hasActiveChild}
              disabled={item.disabled}
              onClick={() => hasChildren && toggleItem(item.href as string)}
              className={cn(
                'data-[active=true]:text-primary h-9 font-medium transition-all data-[active=true]:font-semibold',
                item.disabled && 'pointer-events-none opacity-50'
              )}>
              {item.type === 'externalLink' ? (
                <a
                  href={item.href || ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item?.icon && <item.icon className="size-4" />}
                    <span>{item.title}</span>
                  </div>
                  <ExternalLinkIcon className="ml-auto size-4" />
                </a>
              ) : (
                <Link to={item.href || ''}>
                  {item?.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    };

    return (
      <ul
        ref={ref}
        data-sidebar="menu"
        className={cn('flex w-full min-w-0 flex-col gap-1 p-2', className)}
        {...props}>
        {(items || []).map((item) => renderNavItem(item))}
      </ul>
    );
  }
);

NavMain.displayName = 'NavMain';
