import { TabsProps } from './tabs.types';
import { PageTitle } from '@/components/page-title/page-title';
import { Tabs, TabsLinkTrigger, TabsList } from '@/modules/datum-ui/components/tabs.tsx';
import { cn } from '@shadcn/lib/utils';
import { useMemo } from 'react';
import { useLocation } from 'react-router';

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
    <div
      className={cn(
        '-mx-5 flex h-full w-[calc(100%+2.5rem)] flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto',
        className
      )}>
      {tabsTitle && (
        <div className={cn('mx-auto w-full max-w-5xl px-5', containerClassName)}>
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
        <div className={cn('mx-auto w-full max-w-5xl px-5', containerClassName)}>
          <Tabs value={activeTab}>
            <TabsList className="bg-background flex w-full justify-start rounded-none p-0">
              {(navItems ?? [])
                .filter((nav) => !nav.hidden)
                .map((nav) => (
                  <TabsLinkTrigger
                    key={nav.value}
                    value={nav.value}
                    to={nav.to}
                    className={cn(
                      'flex h-full w-fit items-center gap-2 rounded-none border-b-2 border-transparent',
                      'bg-background focus-visible:ring-0 focus-visible:outline-hidden',
                      'data-[state=active]:border-primary data-[state=active]:shadow-none',
                      'hover:text-foreground !flex-none transition-all'
                    )}>
                    {nav.icon && <nav.icon className="size-4" />}
                    {nav.label}
                  </TabsLinkTrigger>
                ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className={cn('mx-auto h-full w-full max-w-5xl px-5 pt-2', containerClassName)}>
        <div className="flex h-full flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
