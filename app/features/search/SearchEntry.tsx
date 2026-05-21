// app/features/search/SearchEntry.tsx
import { CmdKPalette } from './surfaces/CmdKPalette';
import { MobileSearchSheet } from './surfaces/MobileSearchSheet';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Search } from 'lucide-react';
import { useState } from 'react';

/**
 * Single mount point used by the header. Picks the cmd-K palette on
 * desktop only (>=1024px) and a full-screen mobile sheet on mobile
 * AND tablet. The icon-button trigger is rendered for both compact
 * tiers because the project switcher already eats most of the header
 * width below 1024px — there's no room for an inline search input
 * (handled separately by ProjectSearchBar which now uses `lg:flex`).
 * Cmd-K stays hotkey-driven on desktop because power users have a
 * keyboard.
 */
export function SearchEntry() {
  const breakpoint = useBreakpoint();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (breakpoint === 'desktop') {
    return <CmdKPalette />;
  }

  return (
    <>
      <Tooltip message="Search">
        <Button
          type="quaternary"
          theme="borderless"
          size="small"
          className="hover:bg-sidebar-accent h-7 w-7 cursor-pointer rounded-lg p-0"
          aria-label="Open search"
          onClick={() => setMobileOpen(true)}>
          <Icon icon={Search} size={16} className="text-icon-header size-4" aria-hidden />
        </Button>
      </Tooltip>
      <MobileSearchSheet open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}
