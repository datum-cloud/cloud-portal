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
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
import { ChevronRight, ExternalLinkIcon, LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ComponentProps,
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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

  // Exclude specific sub-paths from activating this nav item
  // Use this for sibling routes like `/export-policies` and `/export-policies/new`
  // where `/export-policies` should NOT be active when on `/export-policies/new`
  // but SHOULD be active for detail routes like `/export-policies/:id/overview`
  excludePaths?: string[];

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
    'text-sidebar-foreground rounded-lg h-8 font-normal text-xs transition-all px-2 py-1 data-[active=true]:bg-sidebar data-[active=true]:text-foreground data-[active=true]:text-sidebar-primary data-[active=true]:[&>svg]:text-primary hover:bg-sidebar hover:text-sidebar-primary hover:[&>svg]:text-sidebar-primary data-[active=true]:hover:[&>svg]:text-sidebar-primary duration-300 gap-2.5',
  disabled: 'pointer-events-none opacity-50',
  icon: 'duration-300 transition-all',
  iconSmall: 'size-4 duration-300 transition-all',
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
    <IconWrapper
      icon={Icon}
      className={cn(size === 'small' ? NAV_STYLES.iconSmall : NAV_STYLES.icon, className)}
    />
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
    const { state: sidebarState, isMobile, closeForNavigation, setOpen } = useSidebar();
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
    const isInitialMount = useRef(true);
    const previousOpenItems = useRef<Record<string, boolean>>({});
    const previousPathname = useRef(pathname);

    // Use overrideState if provided, otherwise use sidebar state
    const state = overrideState ?? sidebarState;
    const previousState = useRef(state);

    // Track previous open state to detect transitions
    useEffect(() => {
      previousOpenItems.current = openItems;
      // Mark initial mount as complete after first render
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }, [openItems]);

    // Track pathname changes
    useEffect(() => {
      previousPathname.current = pathname;
    }, [pathname]);

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

        // Helper to recursively check if any descendant matches the pathname
        const hasActiveDescendant = (navItem: NavItem): boolean => {
          if (!navItem.children || navItem.children.length === 0) {
            return false;
          }

          return navItem.children.some((child) => {
            if (!child.href) {
              // If child has no href but has children, check its descendants
              return hasActiveDescendant(child);
            }

            const cleanChildPath = normalize(child.href);
            const childMatches =
              cleanCurrentPath === cleanChildPath ||
              cleanCurrentPath.startsWith(`${cleanChildPath}/`);

            // If this child matches, return true
            if (childMatches) {
              return true;
            }

            // Otherwise, check this child's descendants
            return hasActiveDescendant(child);
          });
        };

        // If item has children, check if any descendant is active
        const hasChildren = (item.children || []).length > 0;
        if (hasChildren) {
          // If a descendant is active, parent should not be active
          if (hasActiveDescendant(item)) {
            return false;
          }

          // If no descendant is active, only exact match for parent
          return cleanCurrentPath === cleanNavPath;
        }

        // For items without children, check for exact match or sub-path
        // Check if current path is in the excluded paths list
        const isExcluded =
          item.excludePaths?.some((excludePath) => {
            const cleanExcludePath = normalize(excludePath);
            return (
              cleanCurrentPath === cleanExcludePath ||
              cleanCurrentPath.startsWith(`${cleanExcludePath}/`)
            );
          }) ?? false;

        // Match exact path, or sub-paths that are not excluded
        const isDirectMatch =
          cleanCurrentPath === cleanNavPath ||
          (!isExcluded && cleanCurrentPath.startsWith(`${cleanNavPath}/`));

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

    // Helper function to check if an item or any of its children are active
    const hasActiveDescendant = useCallback(
      (item: NavItem): boolean => {
        if (activeNavItem(item)) {
          return true;
        }
        if (item.children) {
          return item.children.some((child) => hasActiveDescendant(child));
        }
        return false;
      },
      [activeNavItem]
    );

    // Helper function to find item by href in the items tree
    const findItemByHref = useCallback((href: string, items: NavItem[]): NavItem | null => {
      for (const item of items) {
        if (item.href === href) {
          return item;
        }
        if (item.children) {
          const found = findItemByHref(href, item.children);
          if (found) return found;
        }
      }
      return null;
    }, []);

    // Close collapsibles when sidebar collapses (unless they have active children)
    useEffect(() => {
      if (previousState.current === 'expanded' && state === 'collapsed') {
        setOpenItems((prev) => {
          const newOpenItems: Record<string, boolean> = {};
          // Keep only items that have active children open
          Object.keys(prev).forEach((itemHref) => {
            const item = findItemByHref(itemHref, items);
            if (item && hasActiveDescendant(item)) {
              newOpenItems[itemHref] = true;
            }
          });
          return newOpenItems;
        });
      }
      previousState.current = state;
    }, [state, items, hasActiveDescendant, findItemByHref]);

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
      const isOpen =
        openItems[item.href as string] !== undefined
          ? openItems[item.href as string]
          : Boolean(pathnameExistInDropdowns.length);
      const hasActiveChild = pathnameExistInDropdowns.length > 0;

      // Handle collapsed state - expand sidebar when clicking items with children
      if (state === 'collapsed' && !isMobile && level <= 2 && hasChildren) {
        return (
          <SidebarMenu key={itemKey}>
            <div className="flex flex-col">
              <NavSidebarMenuButton
                item={item}
                isActive={isActive}
                disableTooltip={disableTooltip}
                className={itemClassName}
                onClick={() => {
                  // Expand sidebar when clicking an item with children
                  setOpen(true);
                  // Also open the collapsible for this item
                  if (item.href) {
                    setOpenItems((prev) => ({ ...prev, [item.href as string]: true }));
                  }
                }}
              />
              {/* Show dots for each sub-item only if one is active */}
              {hasActiveChild && (
                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05,
                        delayChildren: 0.1,
                      },
                    },
                  }}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-0.5">
                  {item.children?.map((subItem) => {
                    const isSubItemActive = activeNavItem(subItem);
                    return (
                      <motion.div
                        key={`collapsed-dot-${subItem.href}-${level}`}
                        variants={{
                          hidden: { opacity: 0 },
                          visible: {
                            opacity: 1,
                            transition: {
                              duration: 0.2,
                              ease: 'easeOut',
                            },
                          },
                        }}>
                        <SidebarMenuButton
                          tooltip={subItem.title}
                          isActive={isSubItemActive}
                          className="h-6 p-0 group-data-[collapsible=icon]:h-6! group-data-[collapsible=icon]:p-0!"
                          asChild>
                          <Link
                            className="flex items-center justify-center"
                            to={subItem.href || ''}
                            onClick={() => {
                              handleNavigation();
                            }}>
                            <span
                              className={cn(
                                'size-1 rounded-full',
                                isSubItemActive ? 'bg-primary' : 'bg-sidebar-primary-foreground'
                              )}
                            />
                          </Link>
                        </SidebarMenuButton>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
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
              open={isOpen}
              onOpenChange={(open) => {
                if (item.href) {
                  // Allow toggling even if it has an active child
                  setOpenItems((prev) => ({ ...prev, [item.href as string]: open }));
                }
              }}
              className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild className="w-full">
                  <NavSidebarMenuButton
                    item={item}
                    isActive={isActive}
                    disableTooltip={disableTooltip}
                    className={itemClassName}>
                    <span>{item.title}</span>
                    <IconWrapper
                      icon={ChevronRight}
                      className="text-sidebar-foreground ml-auto size-3.5! transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                    />
                  </NavSidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
                  <div style={{ minHeight: 0, overflow: 'hidden' }}>
                    <motion.div
                      key={`collapsible-${item.href}-${isOpen}`}
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.05,
                            delayChildren: 0.1,
                          },
                        },
                      }}
                      initial={
                        isInitialMount.current ||
                        (previousOpenItems.current[item.href as string] ===
                          openItems[item.href as string] &&
                          previousState.current === state &&
                          previousPathname.current === pathname &&
                          !hasActiveChild)
                          ? 'visible'
                          : 'hidden'
                      }
                      animate={isOpen ? 'visible' : 'hidden'}>
                      <SidebarMenuSub
                        className={cn(
                          level >= 1 ? 'mr-0 pr-[.1rem]' : '',
                          level === 2 ? 'pl-4' : '',
                          level === 3 ? 'pl-6' : '',
                          'mr-0 gap-0.5 pr-0'
                        )}>
                        {item.children?.map((subItem, index) => (
                          <motion.div
                            key={`${subItem.href}-${level}-${index}`}
                            variants={{
                              hidden: { opacity: 0 },
                              visible: {
                                opacity: 1,
                                transition: {
                                  duration: 0.2,
                                  ease: 'easeOut',
                                },
                              },
                            }}>
                            {renderNavItem(subItem, level + 1)}
                          </motion.div>
                        ))}
                      </SidebarMenuSub>
                    </motion.div>
                  </div>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        );
      }

      const renderCollapsible = (currentItem: NavItem, currentLevel: number) => {
        const currentItemIsActive = activeNavItem(currentItem);
        const currentItemPathnameExistInDropdowns =
          currentItem.children?.filter((dropdownItem: NavItem) =>
            pathname.includes(dropdownItem.href as string)
          ) || [];
        const currentItemIsOpen =
          openItems[currentItem.href as string] ||
          Boolean(currentItemPathnameExistInDropdowns.length);

        return (
          <Collapsible
            key={`collapsed-item-drop-down-item-${currentItem.title}-${currentLevel}`}
            asChild
            open={currentItemIsOpen}
            onOpenChange={(open) => {
              if (currentItem.href) {
                setOpenItems((prev) => ({ ...prev, [currentItem.href as string]: open }));
              }
            }}
            className="group/collapsible">
            <SidebarMenuItem key={`collapsible-sidebar-${currentItem.title}-${currentLevel}`}>
              <CollapsibleTrigger asChild className="w-full">
                <NavSidebarMenuButton
                  item={currentItem}
                  isActive={currentItemIsActive}
                  disableTooltip={disableTooltip}
                  className={itemClassName}>
                  <span>{currentItem.title}</span>
                  <IconWrapper
                    icon={ChevronRight}
                    className="text-sidebar-foreground ml-auto size-3.5! transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                  />
                </NavSidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
                <div style={{ minHeight: 0, overflow: 'hidden' }}>
                  <SidebarMenuSub
                    className={cn(currentLevel >= 1 ? 'mr-0 pr-[.1rem]' : '', 'gap-0.5')}>
                    {currentItem.children?.map((subItem) =>
                      renderNavItem(subItem, currentLevel + 1)
                    )}
                  </SidebarMenuSub>
                </div>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        );
      };

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
              className={cn(level >= 1 && 'h-6', itemClassName)}>
              {item.type === 'externalLink' ? (
                <a
                  href={item.href || ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item?.icon && (
                      <IconWrapper
                        icon={item.icon}
                        className="text-icon-primary size-4 transition-all duration-300"
                      />
                    )}
                    <span>{item.title}</span>
                  </div>
                  <IconWrapper icon={ExternalLinkIcon} className="ml-auto size-4" />
                </a>
              ) : (
                <Link to={item.href || ''} onClick={handleNavigation}>
                  {item?.icon && (
                    <IconWrapper
                      icon={item.icon}
                      className="text-sidebar-foreground transition-all duration-300"
                    />
                  )}
                  <span>{item.title}</span>
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
        className={cn('flex h-full w-full min-w-0 flex-col p-2', className)}
        {...props}>
        {(items || []).map((item) => renderNavItem(item))}
      </ul>
    );
  }
);

NavMain.displayName = 'NavMain';
