/**
 * MetricsFilterSelect - Select filter component for metrics with URL state support
 * Delegates UI to shared components:
 * - Multi-select: '@/components/multi-select/multi-select'
 * - Single-select: '@/components/select-box/select-box'
 */
import { MultiSelect, type MultiSelectOption } from '@/components/multi-select/multi-select';
import { SelectBox, type SelectBoxOption } from '@/components/select-box/select-box';
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import type { FilterOption } from '@/modules/metrics/types/metrics.type';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import { Label } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useMemo } from 'react';

export interface MetricsFilterSelectProps {
  filterKey: string;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  options: FilterOption[] | MultiSelectOption[];
  defaultValue?: string | string[];
  isLoading?: boolean;

  // UI customization
  maxCount?: number | -1;
  showSelectAll?: boolean;
  showClearButton?: boolean;
  itemPreview?: (option: SelectBoxOption) => React.ReactNode;
}

export function MetricsFilterSelect({
  filterKey,
  label,
  description,
  placeholder = 'Select...',
  className,
  disabled = false,
  multiple = false,
  searchable = false,
  options = [],
  defaultValue = multiple ? [] : '',
  maxCount = 3,
  showSelectAll = false,
  showClearButton = true,
  itemPreview,
  isLoading = false,
}: MetricsFilterSelectProps) {
  const { registerUrlState, updateUrlStateEntry } = useMetrics();

  // Normalize defaultValue to consistent format
  const normalizedDefault = useMemo(() => {
    if (multiple) {
      return Array.isArray(defaultValue) ? defaultValue : [];
    }
    return typeof defaultValue === 'string' ? defaultValue : '';
  }, [defaultValue, multiple]);

  // Create URL state hook with proper parser
  const [urlValue, setUrlValue] = useQueryState(
    filterKey,
    createMetricsParser(multiple ? 'array' : 'string', normalizedDefault)
  );

  // Parse URL value to consistent internal format
  const currentValue = useMemo(() => {
    if (multiple) {
      // For multiple: urlValue should already be an array from parseAsArrayOf
      return Array.isArray(urlValue) && urlValue.length > 0 ? urlValue.filter(Boolean) : null;
    } else {
      // For single: urlValue should be a string from parseAsString
      return typeof urlValue === 'string' ? urlValue : '';
    }
  }, [urlValue, multiple]);

  // Register with metrics context once on mount
  useEffect(() => {
    registerUrlState(filterKey, multiple ? 'array' : 'string', normalizedDefault);
  }, [registerUrlState, filterKey, multiple, normalizedDefault]);

  // Update registry with actual URL state hooks (once on mount)
  useEffect(() => {
    if (currentValue) {
      updateUrlStateEntry(filterKey, currentValue, setUrlValue);
    } else {
      updateUrlStateEntry(filterKey, normalizedDefault, setUrlValue);
    }
  }, [updateUrlStateEntry, filterKey, currentValue, setUrlValue]);

  const optionsForMultiSelect: MultiSelectOption[] = useMemo(
    () =>
      options.map((opt) => ({
        label: opt.label,
        value: opt.value,
        // Only map icon if provided and is a component
        icon: (opt as any).icon,
      })),
    [options]
  );

  const optionsForSelectBox: SelectBoxOption[] = useMemo(
    () => options.map((opt) => ({ value: opt.value, label: opt.label })),
    [options]
  );

  // Handle value changes from UI components
  const handleMultiChange = useCallback(
    (newValues: string[]) => {
      (setUrlValue as any)(newValues);
    },
    [setUrlValue]
  );

  const handleSingleChange = useCallback(
    (option: SelectBoxOption) => {
      setUrlValue(option?.value ?? '');
    },
    [setUrlValue]
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <Label htmlFor={filterKey} className="text-sm font-medium">
          {label}
        </Label>
      )}

      {multiple ? (
        <MultiSelect
          className="h-[36px] min-h-0"
          options={optionsForMultiSelect}
          onValueChange={handleMultiChange}
          placeholder={placeholder}
          value={(currentValue ?? []) as string[]}
          disabled={disabled}
          maxCount={maxCount}
          showSelectAll={showSelectAll}
          showClearButton={showClearButton}
          isLoading={isLoading}
        />
      ) : (
        <SelectBox
          className="h-[36px] min-h-0"
          value={currentValue as string}
          onChange={handleSingleChange}
          options={optionsForSelectBox}
          placeholder={placeholder}
          disabled={disabled}
          searchable={searchable}
          itemPreview={itemPreview}
          isLoading={isLoading}
        />
      )}

      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}
