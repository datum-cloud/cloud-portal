import { PageTitle } from '@/components/page-title/page-title';
import { Tabs, TabsLinkTrigger, TabsList } from '@/components/ui/tabs';
import { cn } from '@/utils/helpers/misc.helper';
import { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router';

export interface TabsProps {
  children: React.ReactNode;
  className?: string;
  widthClassName?: string;
  tabsTitle?: TabsTitleProps;
  navs?: TabsNavProps[];
}

export interface TabsNavProps {
  value: string;
  label: string;
  to: string;
  icon?: LucideIcon;
}

export interface TabsTitleProps {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function TabsLayout({
  children,
  className,
  widthClassName = 'w-full max-w-5xl',
  tabsTitle,
  navs,
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
        <div className={cn('mx-auto px-5', widthClassName)}>
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
        <div className={cn('mx-auto px-5', widthClassName)}>
          <Tabs value={activeTab}>
            <TabsList className="bg-background flex w-full justify-start rounded-none p-0">
              {(navs ?? []).map((nav) => (
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

      <div className={cn('mx-auto px-5', widthClassName)}>
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
