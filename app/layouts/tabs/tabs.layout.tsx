import { TabsProps } from './tabs.types';
import { Tabs, TabsLinkTrigger, TabsList } from '@datum-ui/components';
import { PageTitle } from '@datum-ui/components/page-title';
import { cn } from '@shadcn/lib/utils';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router';

export default function TabsLayout({
  children,
  className,
  containerClassName = '',
  tabsTitle,
  navItems,
}: TabsProps) {
  const pathname = useLocation().pathname;

  const activeTab = useMemo(() => {
    return pathname.split('/').pop();
  }, [pathname]);

  return (
    <div className={cn('flex h-full flex-1 flex-col gap-8', className)}>
      {tabsTitle && (
        <div className={cn('w-full', containerClassName)}>
          <PageTitle
            title={tabsTitle.title}
            description={tabsTitle.description}
            actions={tabsTitle.actions}
            className={tabsTitle.className}
          />
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-x-0 bottom-0 z-10 border-b" />
        <div className={cn('w-full', containerClassName)}>
          <Tabs value={activeTab}>
            <TabsList className="bg-background flex w-full justify-start rounded-none p-0">
              {(navItems ?? [])
                .filter((nav) => !nav.hidden)
                .map((nav) => (
                  <TabsLinkTrigger
                    key={nav.value}
                    value={nav.value}
                    href={nav.to}
                    linkComponent={Link}
                    className={cn(
                      'flex h-full w-fit items-center gap-2 rounded-none border-b-2 border-transparent px-0',
                      'bg-background focus-visible:ring-0 focus-visible:outline-hidden',
                      'data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none',
                      'text-foreground mx-3.5 !flex-none text-sm font-medium transition-all first:ml-0 last:mr-0'
                    )}>
                    {nav.icon && <nav.icon className="size-4" />}
                    {nav.label}
                  </TabsLinkTrigger>
                ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className={cn('h-full w-full pt-2', containerClassName)}>
        <div className="flex h-full flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
