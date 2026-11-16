import { SubLayoutProps } from './sub.types';
import { SubNavigationTabs } from '@/components/sub-navigation';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { cn } from '@datum-cloud/datum-ui/utils';

export function SubLayout({
  children,
  navItems,
  title,
  status,
  actions,
  className,
  containerClassName,
  contentClassName,
}: SubLayoutProps) {
  const hasPageTitle = title != null || status != null || actions != null;

  return (
    <div className={cn('flex h-full flex-1 flex-col', className)}>
      <div className="flex flex-col gap-4">
        {hasPageTitle && <PageTitle title={title} description={status} actions={actions} />}
        {navItems && navItems.length > 0 && (
          <div className="border-border -mx-4 border-b px-4 md:-mx-6 md:px-6">
            <SubNavigationTabs tabs={navItems} />
          </div>
        )}
      </div>
      {/* flex-1, not h-full: h-full is the whole SubLayout, title and tabs
          included, so the content ran past the bottom by their height and
          full-height pages (logs) scrolled. */}
      <div className={cn('mt-5 flex w-full flex-1 flex-col', containerClassName)}>
        <div className={cn('flex h-full flex-1 flex-col', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
