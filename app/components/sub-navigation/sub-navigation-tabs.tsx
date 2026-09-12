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
 * Visuals (underline, sliding indicator, scrolling) come from the datum-ui
 * `line` tabs variant; this component only decides which tab is active.
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
