import { KindIcon, kindDisplayName } from './kindIcon';
import { kindToHref } from './kindToHref';
import type { SearchHit } from '@/resources/search';
import { CommandItem } from '@datum-cloud/datum-ui/command';
import { Link } from 'react-router';

interface Props {
  hit: SearchHit;
  onSelect: (hit: SearchHit) => void;
  /** True for global cmd-K (need tenant disambiguation), false for project bar (redundant). */
  showTenant: boolean;
  /**
   * Whether to render the kind icon at the start of the row.
   * Default `true` — useful for mixed-kind lists like "Recently opened"
   * where the icon is the only per-row signal of which kind a hit is.
   * Set `false` inside grouped-by-kind result lists where the kind is
   * already communicated by the surrounding CommandGroup heading.
   */
  showIcon?: boolean;
}

/**
 * One row in a search results list. Returns null when the hit's kind has
 * no detail route — kindToHref handles that filter centrally.
 *
 * The min-h-[44px] class on the inner Link guarantees a WCAG-compliant
 * touch target on mobile.
 */
export function SearchResultItem({ hit, onSelect, showTenant, showIcon = true }: Props) {
  const href = kindToHref(hit);
  if (!href) return null;

  const primary = hit.displayName || hit.name;
  // Show the K8s resource name as a secondary line only when it differs
  // from the human-readable displayName. This disambiguates same-domain
  // hits that live under different K8s resource names.
  const secondary = hit.displayName && hit.displayName !== hit.name ? hit.name : null;

  return (
    <CommandItem
      asChild
      onSelect={() => onSelect(hit)}
      role="option"
      aria-label={`${kindDisplayName(hit.kind)} ${primary}`}>
      <Link to={href} className="flex min-h-[44px] items-center gap-2 px-2">
        {showIcon && <KindIcon kind={hit.kind} className="size-4 shrink-0 opacity-70" />}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{primary}</span>
          {secondary && <span className="text-muted-foreground truncate text-xs">{secondary}</span>}
        </div>
        {showTenant && hit.tenant.name && hit.tenant.type !== 'platform' && (
          <span className="text-muted-foreground max-w-[8rem] shrink-0 truncate text-xs">
            {hit.tenant.name}
          </span>
        )}
      </Link>
    </CommandItem>
  );
}
