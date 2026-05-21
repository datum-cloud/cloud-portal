// app/features/search/surfaces/MobileSearchSheet.tsx
//
// Full-screen mobile search surface. Scope is project-driven via
// useActiveProject — prefers the route's project, falls back to
// localStorage. When no project is available the sheet still opens
// and shows an "Open a project to search." inline empty state.
//
// Sheet side="bottom" gives a thumb-reachable affordance; the
// full-height variant fills the viewport so the keyboard can pop up
// without occluding results.
import { useActiveProject } from '../engine/useActiveProject';
import { useSearchEngine } from '../engine/useSearchEngine';
import { SearchEmptyState } from '../shared/SearchEmptyState';
import { SearchPartialPermissionNote } from '../shared/SearchPartialPermissionNote';
import { SearchResultList } from '../shared/SearchResultList';
import { SearchScopeFooter } from '../shared/SearchScopeFooter';
import type { SearchHit } from '@/resources/search';
import { Button } from '@datum-cloud/datum-ui/button';
import { Command, CommandEmpty, CommandInput, CommandList } from '@datum-cloud/datum-ui/command';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@datum-cloud/datum-ui/sheet';
import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export function MobileSearchSheet({ open, onOpenChange }: Props) {
  const { project } = useActiveProject();

  const [partialDismissed, setPartialDismissed] = useState(false);

  const engine = useSearchEngine({
    projectId: project?.id ?? null,
    surface: 'mobile-sheet',
    open,
    onOpenChange,
  });

  // Commit the sheet close at the surface level BEFORE delegating to the
  // engine. On mobile (touch) the CommandItem's onSelect and the child
  // <Link>'s navigation race each other: when selectHit's batched state
  // updates (setQuery + onOpenChange) commit, the Sheet's exit animation
  // overlaps with react-router's transition and the in-flight query
  // reset re-renders <CommandList> mid-close — reading visually as a
  // flicker (show → hide → show → hide).
  //
  // Calling onOpenChange(false) here makes the parent's mobileOpen state
  // transition synchronously with the tap event, so the Sheet begins its
  // exit immediately. engine.selectHit's own onOpenChange(false) becomes
  // a redundant no-op once the parent state is already false.
  const handleSelect = useCallback(
    (hit: SearchHit) => {
      onOpenChange(false);
      engine.selectHit(hit);
    },
    [onOpenChange, engine]
  );

  // Drop role/id from spreads — Command primitives manage their own roles.
  const { role: _comboRole, ...comboboxProps } = engine.comboboxProps;
  const { role: _listRole, ...listboxProps } = engine.listboxProps;

  const showPartial = engine.hasPartialPermission && !partialDismissed;
  const debouncedQuery = engine.debouncedQuery;
  const isInactive = engine.inactiveReason === 'no-project';
  const placeholder = isInactive ? 'Open a project to search…' : 'Search in this project…';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background max-h-[80svh] gap-0 rounded-t-xl p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm font-semibold">Search</SheetTitle>
          <SheetDescription className="sr-only">
            {project ? `Search resources in the ${project.displayName} project` : 'Search'}
          </SheetDescription>
        </SheetHeader>
        <div className="border-b px-4 py-2">
          <Command shouldFilter={false}>
            <div className="relative">
              <CommandInput
                placeholder={placeholder}
                value={engine.query}
                onValueChange={engine.setQuery}
                disabled={isInactive}
                className="dark:bg-input-bg h-9 bg-white pr-9 text-xs placeholder:text-xs"
                iconClassName="text-icon-quaternary size-3.5"
                {...comboboxProps}
                autoFocus
              />
              {engine.query.length > 0 && (
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="icon"
                  aria-label="Clear search"
                  onClick={() => engine.setQuery('')}
                  className="text-icon-quaternary hover:text-destructive absolute top-1/2 right-2 size-5 -translate-y-1/2 p-0 hover:bg-transparent">
                  <Icon icon={X} size={12} className="size-3" aria-hidden />
                </Button>
              )}
            </div>
          </Command>
        </div>
        <span className="sr-only" aria-live="polite">
          {engine.ariaStatusText}
        </span>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Command shouldFilter={false} className="rounded-none focus-visible:outline-none">
            <CommandList {...listboxProps}>
              {isInactive ? (
                <CommandEmpty>Open a project to search.</CommandEmpty>
              ) : (
                <>
                  {showPartial && (
                    <SearchPartialPermissionNote
                      deniedKinds={engine.deniedKinds}
                      onDismiss={() => setPartialDismissed(true)}
                    />
                  )}
                  {debouncedQuery.length === 0 ? (
                    <SearchEmptyState
                      recentQueries={engine.recentQueries}
                      recentHits={engine.recentHits}
                      onRecentQuery={engine.setQuery}
                      onRecentHit={handleSelect}
                      onClearRecents={engine.clearRecents}
                    />
                  ) : engine.isLoading ? (
                    <CommandEmpty>Searching…</CommandEmpty>
                  ) : engine.totalHits === 0 ? (
                    <CommandEmpty>No matches.</CommandEmpty>
                  ) : (
                    <SearchResultList
                      groups={engine.groups}
                      onSelect={handleSelect}
                      showTenant={false}
                    />
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </div>
        <SearchScopeFooter project={project} hasResults={engine.totalHits > 0} />
      </SheetContent>
    </Sheet>
  );
}
