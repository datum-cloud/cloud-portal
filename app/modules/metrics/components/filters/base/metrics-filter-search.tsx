/**
 * MetricsFilterSearch - Search filter component for metrics with URL state support
 */
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import { Input, Label } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { Search, X } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useCallback, useEffect } from 'react';

export interface MetricsFilterSearchProps {
  filterKey: string;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  defaultValue?: string;
}

export function MetricsFilterSearch({
  filterKey,
  label,
  description,
  placeholder = 'Search...',
  className,
  disabled = false,
  defaultValue = '',
}: MetricsFilterSearchProps) {
  const { registerUrlState, updateUrlStateEntry } = useMetrics();

  // Create URL state hook first to get initial value from URL
  const [value, setValue] = useQueryState(filterKey, createMetricsParser('string', defaultValue));

  // Register URL state for this filter with the actual initial value
  useEffect(() => {
    registerUrlState(filterKey, 'string', value || defaultValue);
  }, [registerUrlState, filterKey, defaultValue]);

  // Update registry with actual URL state hooks
  useEffect(() => {
    updateUrlStateEntry(filterKey, value, setValue);
  }, [updateUrlStateEntry, filterKey, value, setValue]);

  const reset = useCallback(() => {
    setValue(defaultValue);
  }, [setValue, defaultValue]);

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <Label htmlFor={filterKey} className="text-sm font-medium">
          {label}
        </Label>
      )}

      <div className="relative">
        <Icon
          icon={Search}
          className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
        />
        <Input
          id={filterKey}
          type="text"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          className="pr-9 pl-9"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2">
            <Icon icon={X} className="h-4 w-4" />
          </button>
        )}
      </div>

      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}
