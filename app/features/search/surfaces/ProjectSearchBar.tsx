// app/features/search/surfaces/ProjectSearchBar.tsx
//
// Always-visible search input. The `header` variant sits in the
// project-layout header chrome; the `hero` variant is the large search
// box on the project home page (the header one is hidden there).
//
// Header variant is desktop only (lg+, ≥1024px) — hidden via `hidden lg:flex` on
// mobile AND tablet because the project switcher already eats most
// of the header width below 1024px, leaving no room for an inline
// search input. Mobile + tablet users get the MobileSearchSheet
// triggered from the global header icon-button (see SearchEntry).
//
// Scope is derived via useActiveProject, which prefers the route's
// project (useApp().project) and falls back to localStorage. Since
// this surface mounts inside the project layout, the project is
// effectively always present — the null guard is defensive.
import { useActiveProject } from '../engine/useActiveProject';
import { useSearchEngine } from '../engine/useSearchEngine';
import { SearchEmptyState } from '../shared/SearchEmptyState';
import { SearchPartialPermissionNote } from '../shared/SearchPartialPermissionNote';
import { SearchResultList } from '../shared/SearchResultList';
import { SearchScopeFooter } from '../shared/SearchScopeFooter';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useOs } from '@/hooks/useOs';
import { Button } from '@datum-cloud/datum-ui/button';
import { Command, CommandEmpty, CommandList } from '@datum-cloud/datum-ui/command';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { InputWithAddons } from '@datum-cloud/datum-ui/input-with-addons';
import { Popover, PopoverAnchor, PopoverContent } from '@datum-cloud/datum-ui/popover';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ProjectSearchBarVariant = 'header' | 'hero';

export function ProjectSearchBar({ variant = 'header' }: { variant?: ProjectSearchBarVariant }) {
  const isHero = variant === 'hero';
  const { project } = useActiveProject();
  const breakpoint = useBreakpoint();
  const os = useOs();
  const [open, setOpen] = useState(false);
  const [partialDismissed, setPartialDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Always call the engine to keep hook order stable across re-renders.
  // Engine internally disables queries when projectId is null.
  const engine = useSearchEngine({
    projectId: project?.id ?? null,
    surface: isHero ? 'project-home' : 'project-bar',
    open,
    onOpenChange: setOpen,
  });

  // ⌘K / Ctrl+K → focus the inline search input. The header variant is
  // desktop only — on mobile and tablet it is hidden via `hidden lg:flex`,
  // so focusing an invisible element would be a no-op (or worse, jump
  // scroll on some browsers). The hero variant is visible at every
  // breakpoint. preventDefault stops the browser's default focus-omnibox
  // behavior on Chrome/Firefox.
  useEffect(() => {
    if (!isHero && breakpoint !== 'desktop') return;
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K';
      if (!isK || !(e.metaKey || e.ctrlKey)) return;
      // If the user is already typing in OUR input, let the browser handle
      // the keystroke normally (so they can use Cmd+K inside the input for
      // OS-level shortcuts if any).
      if (e.target === inputRef.current) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [breakpoint, isHero]);

  if (!project) return null;

  const showPartial = engine.hasPartialPermission && !partialDismissed;
  const debouncedQuery = engine.debouncedQuery;

  // comboboxProps includes role="combobox" but the native <input> inside
  // <Input> doesn't need it — we spread only the ARIA relationship attrs.
  const { role: _comboRole, ...comboboxProps } = engine.comboboxProps;

  // listboxProps includes role="listbox" but CommandList (cmdk) sets its
  // own role internally. Spread only the id so aria-controls resolves.
  const { role: _listRole, ...listboxProps } = engine.listboxProps;

  return (
    <div className={cn('relative w-full', isHero ? 'flex' : 'hidden max-w-md lg:flex')}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="relative w-full">
            <InputWithAddons
              ref={inputRef}
              value={engine.query}
              onChange={(e) => {
                engine.setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={isHero ? 'Search domains, DNS zones, load balancers…' : 'Search'}
              aria-keyshortcuts={os === 'macos' ? 'Meta+K' : 'Control+K'}
              className={cn(
                'h-full border-none bg-transparent pr-0',
                isHero ? 'text-sm placeholder:text-sm' : 'text-xs placeholder:text-xs'
              )}
              containerClassName={cn(
                'relative outline-none',
                isHero
                  ? 'bg-card border-input h-12 rounded-lg border pr-3 pl-3 shadow-xs'
                  : 'border-none min-w-64 focus-within:shadow-none pl-1 pr-2'
              )}
              leading={
                <Icon
                  icon={Search}
                  size={isHero ? 16 : 14}
                  className="text-icon-quaternary"
                  aria-hidden
                />
              }
              trailing={
                engine.query.length > 0 ? (
                  <Button
                    type="quaternary"
                    theme="borderless"
                    size="icon"
                    aria-label="Clear search"
                    onClick={() => {
                      engine.setQuery('');
                    }}
                    className="text-icon-quaternary hover:text-destructive absolute top-1/2 right-1.5 size-5 -translate-y-1/2 p-0 hover:bg-transparent">
                    <Icon icon={X} size={12} className="size-3" aria-hidden />
                  </Button>
                ) : (
                  isHero && (
                    <kbd
                      aria-hidden
                      className="text-muted-foreground border-input hidden rounded border px-1.5 py-0.5 font-sans text-xs sm:inline-block">
                      {os === 'macos' ? '⌘ K' : 'Ctrl K'}
                    </kbd>
                  )
                )
              }
              {...comboboxProps}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="popover-content-width-full min-w-3xs p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Don't close when interacting with anything inside the anchor
            // (input, clear button, decorative icon). PopoverAnchor doesn't
            // intercept clicks, so without this Radix would treat the clear
            // button as "outside" and close the popover — the input's
            // onFocus would then re-open it, producing a flicker.
            const target = e.target as Node | null;
            if (target && anchorRef.current?.contains(target)) {
              e.preventDefault();
            }
          }}>
          <span className="sr-only" aria-live="polite">
            {engine.ariaStatusText}
          </span>
          <Command shouldFilter={false}>
            <CommandList {...listboxProps}>
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
                  onRecentHit={engine.selectHit}
                  onClearRecents={engine.clearRecents}
                />
              ) : engine.isLoading ? (
                <CommandEmpty>Searching…</CommandEmpty>
              ) : engine.isError ? (
                <CommandEmpty>{engine.errorMessage}</CommandEmpty>
              ) : engine.totalHits === 0 ? (
                <CommandEmpty>No matches in this project.</CommandEmpty>
              ) : (
                <SearchResultList
                  groups={engine.groups}
                  onSelect={engine.selectHit}
                  showTenant={false}
                />
              )}
            </CommandList>
          </Command>
          <SearchScopeFooter project={project} hasResults={engine.totalHits > 0} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
