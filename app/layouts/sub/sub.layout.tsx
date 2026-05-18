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
      <div className="flex flex-col gap-6">
        {hasPageTitle && <PageTitle title={title} description={status} actions={actions} />}
        <div className="border-border -mx-4 border-b px-4 md:-mx-9 md:px-9">
          <SubNavigationTabs tabs={navItems} />
        </div>
      </div>
      <div className={cn('mt-6 h-full w-full', containerClassName)}>
        <div className={cn('flex h-full flex-1 flex-col', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
