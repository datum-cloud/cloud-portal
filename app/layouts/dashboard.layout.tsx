import { ContentWrapper } from '@/components/content-wrapper';
import { Header } from '@/components/header';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { AppNavigation, NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { SidebarInset, SidebarProvider, useSidebar } from '@datum-cloud/datum-ui/sidebar';
import { cn } from '@datum-cloud/datum-ui/utils';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Link, useLocation, useRouteLoaderData, useSearchParams } from 'react-router';

/**
 * Internal component that handles dashboard-specific logic
 * Must be used inside SidebarProvider to access useSidebar hook
 */
const DashboardContent = ({
  children,
  containerClassName,
  contentClassName,
}: {
  children: React.ReactNode;
  containerClassName?: string;
  contentClassName?: string;
}) => {
  const { hasSubLayout } = useSidebar();
  const [isReady, setIsReady] = useState(false);

  // Mark as ready after first layout to prevent flash
  useLayoutEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <div
      className={cn(
        'min-h-0 min-w-0 flex-1 transition-opacity duration-75',
        !isReady && 'opacity-0',
        isReady && 'opacity-100'
      )}>
      {hasSubLayout ? (
        children
      ) : (
        <ContentWrapper
          containerClassName={cn('overflow-y-auto', containerClassName)}
          contentClassName={cn('gap-4', contentClassName)}>
          {children}
        </ContentWrapper>
      )}
    </div>
  );
};

export function DashboardLayout({
  children,
  navItems,
  sidebarCollapsible = 'icon',
  currentOrg,
  currentProject,
  contentClassName,
  sidebarHeader,
  containerClassName,
  expandBehavior,
  showBackdrop = false,
  closeOnNavigation = false,
  sidebarLoading = false,
  switcherLoading = false,
  bottomBar,
  banner,
  defaultSidebarOpen,
  headerContent,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  sidebarCollapsible?: 'offcanvas' | 'icon' | 'none';
  currentOrg?: Organization;
  currentProject?: Project;
  contentClassName?: string;
  sidebarHeader?: string | React.ReactNode;
  containerClassName?: string;
  /**
   * How expanding the nav treats the page. `overlay` floats it above the
   * content so the layout never reflows; `push` widens the rail's spacer and
   * displaces everything to its right.
   *
   * Defaults to following the pin: pinning the nav pushes the page, while the
   * hover peek overlays it. Pass a value to force one behaviour for both.
   */
  expandBehavior?: 'push' | 'overlay';
  showBackdrop?: boolean;
  closeOnNavigation?: boolean;
  /** Show skeleton in sidebar while loading */
  sidebarLoading?: boolean;
  /** Show skeleton in org/project switchers while loading (prevents layout shift) */
  switcherLoading?: boolean;
  /** Optional bar rendered at the bottom of the layout */
  bottomBar?: React.ReactNode;
  /**
   * Optional full-width bar rendered inside the content column, above the
   * scrollable area — structurally pinned under the header (the scroll
   * container is DashboardContent, so this never scrolls away). Used for
   * project-state notices (e.g. suspension); reusable for other project-state
   * notices. Note: renders inside the content column's <main> (right of the
   * sidebar), not viewport-full-bleed.
   */
  banner?: React.ReactNode;
  /**
   * Initial sidebar state. When omitted, falls back to the nav state the user
   * last pinned (persisted cookie), then to expanded on desktop / collapsed on
   * tablet.
   */
  defaultSidebarOpen?: boolean;
  /** Optional content rendered between the org/project switcher and the global search entry in the header. */
  headerContent?: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const breakpoint = useBreakpoint();
  const isTablet = breakpoint === 'tablet';

  // The nav state the user last pinned, read from a cookie by the root loader.
  // `undefined` until they express a preference, so a caller's explicit prop
  // wins, then the persisted pin, then the per-breakpoint default.
  const rootData = useRouteLoaderData('root') as { sidebarOpen?: boolean } | undefined;
  const initialSidebarOpen = defaultSidebarOpen ?? rootData?.sidebarOpen ?? !isTablet;

  // Held here rather than inside SidebarProvider so expandBehavior can follow
  // it: a pinned nav reserves layout space, an unpinned one only ever floats.
  const [isPinned, setIsPinned] = useState(initialSidebarOpen);

  // The provider auto-collapses narrow viewports only while uncontrolled, so
  // mirror that here. useBreakpoint reports desktop during SSR and corrects on
  // mount, which is when this catches up.
  useEffect(() => {
    if (breakpoint !== 'desktop') setIsPinned(false);
  }, [breakpoint]);

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden">
      {/* Header with integrated mobile hamburger */}
      <Header
        currentProject={currentProject}
        currentOrg={currentOrg}
        switcherLoading={switcherLoading}
        navItems={navItems}
        headerContent={headerContent}
      />

      {/* Sidebar + Content area below header - flex-1 min-h-0 so only this area scrolls on mobile */}
      <SidebarProvider
        open={isPinned}
        onOpenChange={setIsPinned}
        // Expand the icon rail on hover (desktop + tablet) so labels are readable without pinning open.
        expandOnHover={sidebarCollapsible === 'icon'}
        // Pinning the nav pushes the page over, the way it did before — the nav
        // now owns that space. The hover peek overlays instead, so glancing at
        // the labels never reflows the page.
        expandBehavior={expandBehavior ?? (isPinned ? 'push' : 'overlay')}
        showBackdrop={showBackdrop}
        className="flex min-h-0 flex-1 overflow-hidden"
        style={
          {
            '--sidebar-width': '16.5rem',
            '--sidebar-width-icon': '3rem',
            '--sidebar-width-mobile': '18.75rem',
          } as React.CSSProperties
        }>
        {(navItems.length > 0 || sidebarHeader != null || sidebarLoading) && (
          <AppNavigation
            title={sidebarHeader as any}
            navItems={navItems}
            collapsible={sidebarCollapsible}
            // Overrides datum-ui's 200ms linear width tween with an ease-out
            // curve; custom.css brings the item labels in step with it.
            className="top-12 duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            closeOnNavigation={closeOnNavigation}
            currentPath={pathname}
            linkComponent={Link}
            defaultOpen={searchParams.get('sidebar') !== 'false'}
            loading={sidebarLoading}
          />
        )}
        <SidebarInset className="flex min-h-0 flex-col">
          {banner}
          <DashboardContent
            containerClassName={containerClassName}
            contentClassName={contentClassName}>
            {children}
          </DashboardContent>
          {bottomBar}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
