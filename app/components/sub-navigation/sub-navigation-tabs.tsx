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
 * The href of the tab `pathname` is on: the longest tab path it starts with.
 * A tab's query string (e.g. a selected account carried across tabs) is
 * ignored for the match. Empty when it's on none.
 */
export function activeTabHref(pathname: string, tabs: SubNavigationTab[]): string {
  let bestHref = '';
  let bestLength = 0;
  for (const tab of tabs) {
    const tabPath = tab.href.split(/[?#]/)[0];
    if (pathname.startsWith(tabPath) && tabPath.length > bestLength) {
      bestHref = tab.href;
      bestLength = tabPath.length;
    }
  }
  return bestHref;
}

/**
 * Horizontal scrollable tab bar for sub-navigation.
 * Used on mobile/tablet as SubLayout replacement, and on all breakpoints for settings pages.
 *
 * Visuals (underline, sliding indicator, scrolling) come from the datum-ui
 * `line` tabs variant; this component only decides which tab is active.
 *
 * Active tab: see `activeTabHref`.
 * Hidden when no visible tabs exist.
 */
export function SubNavigationTabs({ tabs, className, containerClassName }: SubNavigationTabsProps) {
  const { pathname } = useLocation();

  const visibleTabs = useMemo(() => tabs.filter((t) => !t.hidden), [tabs]);

  // A stable string, not an object, so the memo holds.
  const activeHref = useMemo(() => activeTabHref(pathname, visibleTabs), [pathname, visibleTabs]);

  if (visibleTabs.length === 0) return null;

  return (
    <div className={cn('relative', className)}>
      <div className={cn('w-full', containerClassName)}>
        <Tabs value={activeHref}>
          <TabsList variant="line">
            {visibleTabs.map((tab) => (
              <TabsLinkTrigger
                key={tab.href}
                value={tab.href}
                href={tab.href}
                linkComponent={Link}
                className="text-xs md:py-2">
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
