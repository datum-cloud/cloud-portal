import { SearchResultItem } from './SearchResultItem';
import { KindIcon, kindDisplayName } from './kindIcon';
import type { SearchHit, SearchHitGroup } from '@/resources/search';
import { CommandGroup, CommandItem } from '@datum-cloud/datum-ui/command';

interface Props {
  groups: SearchHitGroup[];
  onSelect: (hit: SearchHit) => void;
  /** True for global cmd-K, false for project-scoped surfaces. */
  showTenant: boolean;
}

/**
 * Renders the grouped-by-kind result list. Each kind becomes a
 * CommandGroup; the group heading carries the kind icon + label so
 * rows below it stay text-only (less visual repetition). Mixed-kind
 * lists like "Recently opened" don't use this component — they
 * render SearchResultItem with the default `showIcon={true}` so each
 * row keeps its own kind signal.
 *
 * Truncated groups (hasMore) show a disabled "Show all" row beneath.
 * Returns null for empty input — callers render their own empty state.
 */
export function SearchResultList({ groups, onSelect, showTenant }: Props) {
  if (groups.length === 0) return null;
  return (
    <>
      {groups.map((g) => (
        <CommandGroup
          key={g.kind}
          heading={
            <span className="flex items-center gap-1.5">
              <KindIcon kind={g.kind} className="size-3.5 opacity-70" />
              {kindDisplayName(g.kind)}
            </span>
          }>
          {g.hits.map((h) => (
            <SearchResultItem
              key={h.uid}
              hit={h}
              onSelect={onSelect}
              showTenant={showTenant}
              showIcon={false}
            />
          ))}
          {g.hasMore && (
            <CommandItem disabled className="text-muted-foreground text-xs">
              Show all in {kindDisplayName(g.kind)}…
            </CommandItem>
          )}
        </CommandGroup>
      ))}
    </>
  );
}
