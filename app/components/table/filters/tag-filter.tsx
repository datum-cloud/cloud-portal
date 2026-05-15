import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { useDataTableFilters } from '@datum-cloud/datum-ui/data-table';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { cn } from '@datum-cloud/datum-ui/utils';
import { parseAsArrayOf, parseAsString } from 'nuqs';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * URL parser for `TagFilter` values. Pass via `Table.Client`'s
 * `filterParsers` prop to mirror the multi-select state to a URL query
 * parameter (comma-separated by default — e.g. `?type=A,MX`).
 *
 * @example
 * ```tsx
 * <Table.Client
 *   filters={[<TagFilter column="type" label="Type" options={...} />]}
 *   filterParsers={{ type: tagFilterParser }}
 * />
 * ```
 *
 * Defined as a module-level constant so its identity stays stable across
 * renders — nuqs treats parser identity as the URL schema, so passing a
 * fresh parser every render would re-init the underlying query stores.
 */
export const tagFilterParser = parseAsArrayOf(parseAsString).withDefault([]);

export interface TagFilterOption {
  label: string;
  value: string;
}

export interface TagFilterProps {
  column: string;
  label: string;
  options: TagFilterOption[];
  className?: string;
  /**
   * Optional leading icon (e.g. `<Icon icon={ListFilter} className="size-3.5" />`).
   * Helps the trigger read as a filter chip instead of a generic button.
   * The consumer owns icon sizing/styling — pass any ReactNode.
   */
  icon?: ReactNode;
}

export function TagFilter({ column, label, options, className, icon }: TagFilterProps) {
  const { filters, setFilter, clearFilter, registerFilter, unregisterFilter } =
    useDataTableFilters();

  // Register the column with datum-ui's `checkbox` strategy so client-mode
  // tables apply the multi-select filter to their data. Server-mode tables
  // ignore registered strategies (filtering happens in the fetcher) so this
  // is safe across both modes. Mirrors datum-ui's own `CheckboxFilter`
  // pattern.
  useEffect(() => {
    registerFilter(column, 'checkbox');
    return () => unregisterFilter(column);
  }, [column, registerFilter, unregisterFilter]);

  // Prune stale selections when `options` change. If a previously-selected
  // value disappears from the option set (e.g. a watch update removed the
  // last row of that type from the dataset), drop it from the active
  // filter so the chip count and the filtered rows stay in sync.
  // `latestFiltersRef` lets us read the current filter value without
  // adding `filters` to the dep array — avoids an infinite loop where
  // `setFilter` would re-fire this effect.
  const latestFiltersRef = useRef(filters);
  latestFiltersRef.current = filters;
  useEffect(() => {
    const current = (latestFiltersRef.current[column] as string[] | undefined) ?? [];
    if (current.length === 0) return;
    const validValues = new Set(options.map((o) => o.value));
    const remaining = current.filter((v) => validValues.has(v));
    if (remaining.length === current.length) return;
    if (remaining.length > 0) setFilter(column, remaining);
    else clearFilter(column);
  }, [options, column, setFilter, clearFilter]);

  const selected = (filters[column] as string[] | undefined) ?? [];

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    if (next.length > 0) setFilter(column, next);
    else clearFilter(column);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="quaternary"
          theme="outline"
          size="small"
          className={cn('h-9 gap-1.5 border-dashed', className)}>
          {icon}
          {label}
          {selected.length > 0 && (
            <Badge type="secondary" className="rounded-lg px-1 font-normal">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="popover-content-width-full min-w-48 p-0" align="start">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs',
              selected.includes(opt.value) && 'font-medium'
            )}>
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-sm border',
                selected.includes(opt.value)
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-muted-foreground'
              )}>
              {selected.includes(opt.value) && '✓'}
            </span>
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
