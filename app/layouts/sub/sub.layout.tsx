import { SubLayoutProps } from './sub.types';
import { ContentWrapper } from '@/components/content-wrapper';
import { NavMain, useSidebar } from '@datum-ui/components/sidebar';
import { cn } from '@shadcn/lib/utils';
import { useLayoutEffect } from 'react';

const SUB_SIDEBAR_WIDTH = '12.75rem';

export function SubLayout({
  children,
  navItems,
  sidebarHeader,
  className,
  containerClassName,
  contentClassName,
}: SubLayoutProps) {
  const { setHasSubLayout } = useSidebar();

  // Register this SubLayout with the main sidebar context
  // Use useLayoutEffect to run synchronously before browser paint to prevent flash
  useLayoutEffect(() => {
    setHasSubLayout(true);
    return () => setHasSubLayout(false);
  }, [setHasSubLayout]);

  return (
    <div className={cn('flex h-full w-full', className)}>
      {/* Sub Sidebar - Fixed width, always visible */}
      <aside
        className="bg-sidebar border-sidebar-border h-full shrink-0 overflow-y-auto border-r px-3.5 py-5"
        style={{ width: SUB_SIDEBAR_WIDTH }}>
        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden">
          {/* Sidebar Header */}
          {sidebarHeader && <div className="px-2 pb-0">{sidebarHeader}</div>}

          {/* Navigation Items */}
          <NavMain
            items={navItems}
            className="px-0 py-3.5"
            itemClassName="text-xs h-6"
            disableTooltip
          />
        </div>
      </aside>

      {/* Content Area - Scrollable */}
      <main className="h-full flex-1 overflow-y-auto">
        <ContentWrapper
          containerClassName={cn('overflow-y-auto', containerClassName)}
          contentClassName={contentClassName}>
          {children}
        </ContentWrapper>
      </main>
    </div>
  );
}
