import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { useDataTableFilters } from '@datum-cloud/datum-ui/data-table';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { cn } from '@datum-cloud/datum-ui/utils';

export interface TagFilterOption {
  label: string;
  value: string;
}

export interface TagFilterProps {
  column: string;
  label: string;
  options: TagFilterOption[];
  className?: string;
}

export function TagFilter({ column, label, options, className }: TagFilterProps) {
  const { filters, setFilter, clearFilter } = useDataTableFilters();

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
          className={cn('h-9 border-dashed', className)}>
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
