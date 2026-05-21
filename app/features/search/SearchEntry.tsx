// app/features/search/SearchEntry.tsx
import { MobileSearchSheet } from './surfaces/MobileSearchSheet';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Search } from 'lucide-react';
import { useState } from 'react';

/**
 * Global header mount for compact viewports (mobile + tablet) only.
 *
 * On mobile + tablet (<1024px) the project switcher eats most of the
 * header width, so this surface provides an icon-button that opens
 * the MobileSearchSheet on tap.
 *
 * On desktop (≥1024px) this component renders nothing — desktop users
 * search via the always-visible <ProjectSearchBar/> mounted by the
 * project-detail layout, which also owns the ⌘K / Ctrl+K hotkey for
 * focusing its input.
 */
export function SearchEntry() {
  const breakpoint = useBreakpoint();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (breakpoint === 'desktop') return null;

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
