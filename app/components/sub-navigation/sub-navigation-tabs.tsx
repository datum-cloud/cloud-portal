import { Tabs, TabsLinkTrigger, TabsList } from '@datum-cloud/datum-ui/tabs';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router';

export interface SubNavigationTab {
  label: string;
  href: string;
  icon?: LucideIcon;
  hidden?: boolean;
}

interface SubNavigationTabsProps {
  tabs: SubNavigationTab[];
  className?: string;
  containerClassName?: string;
}

/**
 * Horizontal scrollable tab bar for sub-navigation.
 * Used on mobile/tablet as SubLayout replacement, and on all breakpoints for settings pages.
 *
 * Active tab: prefix match on pathname with longest-match-wins.
 * Hidden when no visible tabs exist.
 */
export function SubNavigationTabs({ tabs, className, containerClassName }: SubNavigationTabsProps) {
  const { pathname } = useLocation();

  const visibleTabs = useMemo(() => tabs.filter((t) => !t.hidden), [tabs]);

  // Find active tab href via longest prefix match — return a stable string, not an object
  const activeHref = useMemo(() => {
    let bestHref = '';
    for (const tab of visibleTabs) {
      if (pathname.startsWith(tab.href) && tab.href.length > bestHref.length) {
        bestHref = tab.href;
      }
    }
    return bestHref;
  }, [pathname, visibleTabs]);

  if (visibleTabs.length === 0) return null;

  return (
    <div className={cn('relative', className)}>
      <div className={cn('w-full', containerClassName)}>
        <Tabs value={activeHref}>
          <TabsList className="bg-background scrollbar-hide flex h-auto w-full justify-start gap-0 overflow-x-auto rounded-none p-0">
            {visibleTabs.map((tab) => (
              <TabsLinkTrigger
                key={tab.href}
                value={tab.href}
                href={tab.href}
                linkComponent={Link}
                className={cn(
                  'flex w-fit shrink-0 items-center gap-2 rounded-none border-b-2 border-transparent px-0',
                  'py-2.5 md:py-2',
                  'bg-background focus-visible:ring-0 focus-visible:outline-hidden',
                  'data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium data-[state=active]:shadow-none',
                  'text-foreground mx-3.5 !flex-none text-xs font-normal transition-all first:ml-0 last:mr-0'
                )}>
                {tab.icon && <tab.icon className="size-4" />}
                {tab.label}
              </TabsLinkTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
