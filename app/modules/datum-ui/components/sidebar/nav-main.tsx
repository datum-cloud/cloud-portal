import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@datum-ui/components';
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
} from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
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

  // Tab Child Links - used to highlight parent nav item when on child tab routes
  // TODO: Replace with proper route hierarchy detection or nested route structure
  // Currently needed to mark parent nav items as active when user is on tab child routes
  // Mixed layout scenario: `/account/preferences` and `/account/activity` use tabs layout,
  // while `/account/organizations` uses sidebar layout, but all share the same parent sidebar nav
  tabChildLinks?: string[];
};

// Centralized style constants for nav menu buttons
const NAV_STYLES = {
  menuButton:
    'text-foreground rounded-lg h-8 font-normal transition-all px-2 py-1 data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground data-[active=true]:font-medium hover:bg-sidebar-accent hover:text-foreground',
  disabled: 'pointer-events-none opacity-50',
  icon: 'text-icon-primary',
  iconSmall: 'text-icon-primary size-4',
} as const;

// Centralized icon renderer component
const NavIcon = ({
  icon: Icon,
  className,
  size = 'default',
}: {
  icon?: LucideIcon;
  className?: string;
  size?: 'default' | 'small';
}) => {
  if (!Icon) return null;
  return (
    <Icon className={cn(size === 'small' ? NAV_STYLES.iconSmall : NAV_STYLES.icon, className)} />
  );
};

NavIcon.displayName = 'NavIcon';

// Wrapper component for NavSidebarMenuButton
type NavSidebarMenuButtonProps = ComponentProps<typeof SidebarMenuButton> & {
  item: Pick<NavItem, 'disabled' | 'icon' | 'title'>;
  isActive?: boolean;
  disableTooltip?: boolean;
};

const NavSidebarMenuButton = forwardRef<HTMLButtonElement, NavSidebarMenuButtonProps>(
  ({ item, isActive, disableTooltip, className, children, asChild, ...props }, ref) => {
    return (
      <SidebarMenuButton
        ref={ref}
        tooltip={disableTooltip ? undefined : item.title}
        isActive={isActive}
        disabled={item.disabled}
        asChild={asChild}
        className={cn(NAV_STYLES.menuButton, item.disabled && NAV_STYLES.disabled, className)}
        {...props}>
        {asChild ? (
          children
        ) : (
          <>
            <NavIcon icon={item.icon} />
            {children}
          </>
        )}
      </SidebarMenuButton>
    );
  }
);

NavSidebarMenuButton.displayName = 'NavSidebarMenuButton';

export const NavMain = forwardRef<
  HTMLUListElement,
  ComponentProps<'ul'> & {
    items: NavItem[];
    overrideState?: 'expanded' | 'collapsed';
    itemClassName?: string;
    disableTooltip?: boolean;
    closeOnNavigation?: boolean;
  }
>(
  (
    { className, items, overrideState, itemClassName, disableTooltip, closeOnNavigation, ...props },
    ref
  ) => {
    const { pathname } = useLocation();
    const { state: sidebarState, isMobile, closeForNavigation } = useSidebar();
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

    // Use overrideState if provided, otherwise use sidebar state
    const state = overrideState ?? sidebarState;

    const activeNavItem = useCallback(
      (item: NavItem) => {
        // pathname is from useLocation() in the outer scope.
        // item is the nav item object with href and tabChildLinks.

        const normalize = (p: string): string => {
          let result = p.startsWith('/') ? p : `/${p}`;
          // Remove trailing slash, unless it's the root path itself
          if (result !== '/' && result.endsWith('/')) {
            result = result.slice(0, -1);
          }
          return result;
        };

        const cleanCurrentPath = normalize(pathname);

        // If no href, can't be active
        if (!item.href) {
          return false;
        }

        const cleanNavPath = normalize(item.href);

        // Handle root path case: nav item is '/'
        if (cleanNavPath === '/') {
          return cleanCurrentPath === '/'; // Active if current path is also root
        }

        // Check for exact match or if current path is a sub-path of nav item path
        const isDirectMatch =
          cleanCurrentPath === cleanNavPath || cleanCurrentPath.startsWith(`${cleanNavPath}/`);

        // Check tabChildLinks for mixed layout scenarios (tabs + sidebar)
        const isTabChildMatch =
          item.tabChildLinks?.some((childPath) => {
            const cleanChildPath = normalize(childPath);
            return (
              cleanCurrentPath === cleanChildPath ||
              cleanCurrentPath.startsWith(`${cleanChildPath}/`)
            );
          }) ?? false;

        return isDirectMatch || isTabChildMatch;
      },
      [pathname]
    );

    const toggleItem = (itemId: string) => {
      setOpenItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    // Handler to close sidebar on navigation (only on desktop when closeOnNavigation prop is enabled)
    // Uses closeForNavigation method which clears hover state and temporarily locks hover expansion
    const handleNavigation = useCallback(() => {
      if (closeOnNavigation && !isMobile) {
        closeForNavigation();
      }
    }, [closeOnNavigation, isMobile, closeForNavigation]);

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

      const isActive = activeNavItem(item);
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
                <NavSidebarMenuButton
                  item={item}
                  isActive={isActive || hasActiveChild}
                  disableTooltip={disableTooltip}
                  className={itemClassName}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {item.children?.map((subItem) => {
                    const hasSubChildren = (subItem.children || []).length > 0;
                    const isSubItemActive = activeNavItem(subItem);

                    if (hasSubChildren) {
                      const hasActiveSubChild = subItem.children?.some((thirdLevelItem) =>
                        activeNavItem(thirdLevelItem)
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
                                const isThirdLevelActive = activeNavItem(thirdLevelItem);

                                return (
                                  <DropdownMenuItem
                                    key={`collapsed-item-drop-down-${thirdLevelItem.title}-${level}`}
                                    className={cn(
                                      isThirdLevelActive && 'bg-primary/10 text-primary'
                                    )}>
                                    <Link
                                      to={thirdLevelItem.href || ''}
                                      className="flex w-full text-xs"
                                      onClick={handleNavigation}>
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
                        <Link
                          to={subItem.href || ''}
                          className="flex w-full items-center"
                          onClick={handleNavigation}>
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
                  <NavSidebarMenuButton
                    item={item}
                    isActive={isActive || hasActiveChild}
                    disableTooltip={disableTooltip}
                    className={itemClassName}>
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </NavSidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub
                    className={cn(
                      level >= 1 ? 'mr-0 pr-[.1rem]' : '',
                      level === 2 ? 'pl-4' : '',
                      level === 3 ? 'pl-6' : '',
                      'mr-0 pr-0'
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
              <NavSidebarMenuButton
                item={currentItem}
                disableTooltip={disableTooltip}
                className={itemClassName}>
                <span>{currentItem.title}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </NavSidebarMenuButton>
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
            <NavSidebarMenuButton
              asChild
              item={item}
              isActive={isActive && !hasActiveChild}
              disableTooltip={disableTooltip}
              onClick={() => hasChildren && toggleItem(item.href as string)}
              className={cn(level >= 1 && 'h-7 opacity-80', itemClassName)}>
              {item.type === 'externalLink' ? (
                <a
                  href={item.href || ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item?.icon && <item.icon className="text-icon-primary size-4" />}
                    <span className={cn(level >= 1 && 'text-xs')}>{item.title}</span>
                  </div>
                  <ExternalLinkIcon className="ml-auto size-4" />
                </a>
              ) : (
                <Link to={item.href || ''} onClick={handleNavigation}>
                  {item?.icon && <item.icon className="text-icon-primary" />}
                  <span className={cn(level >= 1 && 'text-xs')}>{item.title}</span>
                </Link>
              )}
            </NavSidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    };

    return (
      <ul
        ref={ref}
        data-sidebar="menu"
        className={cn('flex h-full w-full min-w-0 flex-col gap-1 p-2', className)}
        {...props}>
        {(items || []).map((item) => renderNavItem(item))}
      </ul>
    );
  }
);

NavMain.displayName = 'NavMain';
