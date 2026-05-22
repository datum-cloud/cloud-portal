import { SearchResultItem } from './SearchResultItem';
import type { SearchHit } from '@/resources/search';
import { CommandEmpty, CommandGroup, CommandItem } from '@datum-cloud/datum-ui/command';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Clock } from 'lucide-react';

interface Props {
  recentQueries: string[];
  recentHits: SearchHit[];
  onRecentQuery: (q: string) => void;
  onRecentHit: (hit: SearchHit) => void;
  onClearRecents: () => void;
}

/**
 * Pre-typing UI for any search surface. When there are no recents at
 * all (first-time user, cleared history), renders a friendly hint
 * instead of nothing — surfaces should never look broken/silent.
 */
export function SearchEmptyState({
  recentQueries,
  recentHits,
  onRecentQuery,
  onRecentHit,
  onClearRecents,
}: Props) {
  if (recentQueries.length === 0 && recentHits.length === 0) {
    return <CommandEmpty>Type to search resources in this project.</CommandEmpty>;
  }

  return (
    <>
      {recentQueries.length > 0 && (
        <CommandGroup
          heading={
            <div className="flex w-full items-center justify-between">
              <span>Recent searches</span>
              <span
                className="text-muted-foreground cursor-pointer text-xs transition-all hover:underline"
                onClick={onClearRecents}>
                Clear all
              </span>
            </div>
          }>
          {recentQueries.map((q) => (
            <CommandItem key={q} onSelect={() => onRecentQuery(q)} className="min-h-[44px]">
              <Icon icon={Clock} size={16} className="size-4 opacity-70" aria-hidden /> {q}
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {recentHits.length > 0 && (
        <CommandGroup heading="Recently opened">
          {recentHits.map((h) => (
            <SearchResultItem key={h.uid} hit={h} onSelect={onRecentHit} showTenant />
          ))}
        </CommandGroup>
      )}
    </>
  );
}
