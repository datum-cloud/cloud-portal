// app/features/search/surfaces/CmdKPalette.tsx
//
// Global command palette. Scope is project-driven via useActiveProject —
// uses the active project from the route, or the last-visited project
// from localStorage as a fallback. Owns the ⌘/ (Ctrl+/) hotkey and the
// open/close state for its dialog. Opens regardless of project state so
// the user can see the "Open a project to search." message even off-project.
import { useActiveProject } from '../engine/useActiveProject';
import { useSearchEngine } from '../engine/useSearchEngine';
import { SearchEmptyState } from '../shared/SearchEmptyState';
import { SearchPartialPermissionNote } from '../shared/SearchPartialPermissionNote';
import { SearchResultList } from '../shared/SearchResultList';
import { SearchScopeFooter } from '../shared/SearchScopeFooter';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '@datum-cloud/datum-ui/command';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function CmdKPalette() {
  const [open, setOpen] = useState(false);
  const [partialDismissed, setPartialDismissed] = useState(false);
  const { project } = useActiveProject();

  const engine = useSearchEngine({
    projectId: project?.id ?? null,
    surface: 'cmd-k',
    open,
    onOpenChange: setOpen,
  });

  // ⌘/ + Ctrl+/ hotkey opens the dialog. Always sets open=true rather
  // than toggling so our state can't desync from Radix's internal state
  // (e.g. when the dialog was closed by an outside-click that didn't go
  // through onOpenChange). Esc-to-close is handled by Radix Dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Reset transient state on close so re-opening starts fresh.
  // Depend on a stable reference (engine.setQuery is a stable setState
  // from the engine hook) rather than the whole engine object, which is
  // recreated every render.
  const engineSetQuery = engine.setQuery;
  useEffect(() => {
    if (!open) {
      engineSetQuery('');
      setPartialDismissed(false);
    }
  }, [open, engineSetQuery]);

  const showPartial = engine.hasPartialPermission && !partialDismissed;
  const debouncedQuery = engine.debouncedQuery;

  // comboboxProps from the engine includes role="combobox" but CommandInput
  // (cmdk) already manages its own role internally. Spread only the ARIA
  // relationship props to avoid a duplicate-role attribute warning.
  const { role: _comboboxRole, ...ariaInputProps } = engine.comboboxProps;

  // listboxProps from the engine includes role="listbox" but CommandList
  // (cmdk) already manages its own role. Spread only the id so the
  // aria-controls reference resolves correctly.
  const { role: _listboxRole, ...ariaListProps } = engine.listboxProps;

  const isInactive = engine.inactiveReason === 'no-project';

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="relative">
        <CommandInput
          placeholder={isInactive ? 'Open a project to search…' : 'Type a command or search…'}
          value={engine.query}
          onValueChange={engine.setQuery}
          disabled={isInactive}
          className="dark:bg-input-bg h-9 bg-white pr-9 text-xs placeholder:text-xs"
          iconClassName="text-icon-quaternary size-3.5"
          {...ariaInputProps}
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
      <span className="sr-only" aria-live="polite">
        {engine.ariaStatusText}
      </span>
      <CommandList {...ariaListProps}>
        {isInactive ? (
          <CommandEmpty>Open a project to search.</CommandEmpty>
        ) : showPartial ? (
          <SearchPartialPermissionNote
            deniedKinds={engine.deniedKinds}
            onDismiss={() => setPartialDismissed(true)}
          />
        ) : null}
        {!isInactive &&
          (debouncedQuery.length === 0 ? (
            <SearchEmptyState
              recentQueries={engine.recentQueries}
              recentHits={engine.recentHits}
              onRecentQuery={engine.setQuery}
              onRecentHit={engine.selectHit}
              onClearRecents={engine.clearRecents}
            />
          ) : engine.isLoading ? (
            <CommandEmpty>Searching…</CommandEmpty>
          ) : engine.totalHits === 0 ? (
            <CommandEmpty>No results for &quot;{debouncedQuery}&quot;.</CommandEmpty>
          ) : (
            <SearchResultList groups={engine.groups} onSelect={engine.selectHit} showTenant />
          ))}
      </CommandList>
      <SearchScopeFooter project={project} hasResults={engine.totalHits > 0} />
    </CommandDialog>
  );
}
