import { SubLayoutProps } from './sub.types';
import { ContentWrapper } from '@/components/content-wrapper';
import { Button, Sheet, SheetContent, SheetTrigger } from '@datum-ui/components';
import { NavMain, useSidebar } from '@datum-ui/components/sidebar';
import { cn } from '@shadcn/lib/utils';
import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router';

const SubNavMenuIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    className="scale-x-[-1]">
    <path
      d="M2.66699 5.33203H13.3337"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M3 11H10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function SubLayout({
  children,
  navItems,
  sidebarHeader,
  className,
  containerClassName,
  contentClassName,
}: SubLayoutProps) {
  const { setHasSubLayout } = useSidebar();
  const [subNavOpen, setSubNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Register this SubLayout with the main sidebar context
  // Use useLayoutEffect to run synchronously before browser paint to prevent flash
  useLayoutEffect(() => {
    setHasSubLayout(true);
    return () => setHasSubLayout(false);
  }, [setHasSubLayout]);

  // Close sub nav sheet on navigation (mobile)
  useLayoutEffect(() => {
    setSubNavOpen(false);
  }, [pathname]);

  return (
    <div className={cn('flex h-full w-full flex-col md:flex-row', className)}>
      {/* Sub Sidebar - Above content below md, left of content at md+ */}
      <aside
        className={cn(
          'bg-sidebar border-sidebar-border shrink-0 overflow-y-auto px-3.5 py-3 md:py-5',
          'w-full border-b md:h-full md:w-51 md:border-r md:border-b-0'
        )}>
        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden">
          {/* Header + Nav row with trigger (justify-between); below md trigger opens sheet */}
          <div className="flex flex-1 items-center justify-between gap-2 md:flex-col md:items-start md:justify-start">
            <div className="flex min-w-0 flex-1 flex-col md:flex-none">
              {sidebarHeader && <div className="px-2 pb-0">{sidebarHeader}</div>}
              {/* Nav visible at md+; below md nav is in the sheet */}
              <div className="hidden md:block">
                <NavMain
                  items={navItems}
                  className="px-0 py-3.5"
                  itemClassName="text-xs h-6"
                  disableTooltip
                />
              </div>
            </div>

            <Sheet open={subNavOpen} onOpenChange={setSubNavOpen}>
              <SheetTrigger asChild>
                <Button
                  type="quaternary"
                  theme="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0 md:hidden"
                  aria-label="Open section navigation">
                  <SubNavMenuIcon />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="bg-sidebar border-sidebar-border flex h-full w-75 max-w-[85vw] flex-col gap-0 overflow-y-hidden border-l p-0 pt-10">
                {sidebarHeader && (
                  <div className="border-sidebar-border border-b px-4 pt-2 pb-3">
                    {sidebarHeader}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto px-3.5 py-3.5">
                  <NavMain
                    items={navItems}
                    className="px-0 py-0"
                    itemClassName="text-xs h-6"
                    disableTooltip
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </aside>

      {/* Content Area - Scrollable */}
      <main className="min-h-0 flex-1 overflow-y-auto md:h-full">
        <ContentWrapper
          containerClassName={cn('overflow-y-auto', containerClassName)}
          contentClassName={contentClassName}>
          {children}
        </ContentWrapper>
      </main>
    </div>
  );
}
