import type {
  AutocompleteGroup,
  AutocompleteOption,
  AutocompleteProps,
} from './autocomplete.types';
import { LoaderOverlay } from '@/components/loader-overlay/loader-overlay';
import { cn } from '@shadcn/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@shadcn/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CheckIcon, ChevronDown } from 'lucide-react';
import * as React from 'react';

// ============================================================================
// Helper: detect grouped options
// ============================================================================

function isGroupedOptions<T extends AutocompleteOption>(
  options: T[] | AutocompleteGroup<T>[]
): options is AutocompleteGroup<T>[] {
  return options.length > 0 && 'options' in options[0];
}

function flattenOptions<T extends AutocompleteOption>(options: T[] | AutocompleteGroup<T>[]): T[] {
  if (isGroupedOptions(options)) {
    return options.flatMap((g) => g.options);
  }
  return options;
}

// ============================================================================
// Trigger
// ============================================================================

interface TriggerProps {
  selectedOption: AutocompleteOption | undefined;
  renderValue?: (option: any) => React.ReactNode;
  placeholder: string;
  loading: boolean;
  disabled: boolean;
  open: boolean;
  id?: string;
  className?: string;
}

const Trigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  (
    { selectedOption, renderValue, placeholder, loading, disabled, open, id, className, ...rest },
    ref
  ) => {
    let displayContent: React.ReactNode;
    if (!selectedOption) {
      displayContent = <span className="text-muted-foreground">{placeholder}</span>;
    } else if (renderValue) {
      displayContent = renderValue(selectedOption);
    } else {
      displayContent = <span className="truncate">{selectedOption.label}</span>;
    }

    return (
      <button
        ref={ref}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        disabled={disabled || loading}
        className={cn(
          'text-input-foreground placeholder:text-input-placeholder',
          'border-input-border bg-input-background/50 relative flex h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all',
          'focus-visible:border-input-focus-border focus-visible:shadow-(--input-focus-shadow)',
          'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden',
          'aria-invalid:border-destructive',
          (disabled || loading) && 'cursor-not-allowed opacity-50',
          className
        )}
        {...rest}>
        {loading && <LoaderOverlay />}
        <div className="min-w-0 flex-1">{displayContent}</div>
        <ChevronDown className="text-muted-foreground ml-2 size-4 shrink-0" />
      </button>
    );
  }
);

Trigger.displayName = 'AutocompleteTrigger';

// ============================================================================
// Default Option Renderer
// ============================================================================

function DefaultOptionContent<T extends AutocompleteOption>({
  option,
  isSelected,
}: {
  option: T;
  isSelected: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <span className="truncate text-sm">{option.label}</span>
        {option.description && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{option.description}</p>
        )}
      </div>
      {isSelected && <CheckIcon className="text-primary size-4 shrink-0" />}
    </div>
  );
}

// ============================================================================
// StaticOptions
// ============================================================================

interface OptionsRendererProps<T extends AutocompleteOption> {
  options: T[] | AutocompleteGroup<T>[];
  selectedValue: string | undefined;
  onSelect: (value: string) => void;
  renderOption?: (option: T, isSelected: boolean) => React.ReactNode;
}

function StaticOptions<T extends AutocompleteOption>({
  options,
  selectedValue,
  onSelect,
  renderOption,
}: OptionsRendererProps<T>) {
  const renderItem = (option: T) => {
    const isSelected = option.value === selectedValue;
    return (
      <CommandItem
        key={option.value}
        value={option.value}
        keywords={[option.label, option.description ?? '']}
        disabled={option.disabled}
        onSelect={() => onSelect(option.value)}
        className="cursor-pointer justify-between px-3 py-2 text-xs">
        {renderOption ? (
          renderOption(option, isSelected)
        ) : (
          <DefaultOptionContent option={option} isSelected={isSelected} />
        )}
      </CommandItem>
    );
  };

  if (isGroupedOptions(options)) {
    return (
      <>
        {options.map((group, index) => (
          <CommandGroup
            key={group.label}
            heading={group.label}
            className={index > 0 ? 'border-t pt-1' : ''}>
            {group.options.map(renderItem)}
          </CommandGroup>
        ))}
      </>
    );
  }

  return <CommandGroup className="p-0">{(options as T[]).map(renderItem)}</CommandGroup>;
}

// ============================================================================
// VirtualizedOptions
// ============================================================================

function VirtualizedOptions<T extends AutocompleteOption>({
  options,
  selectedValue,
  onSelect,
  renderOption,
  itemSize = 36,
  listClassName,
}: OptionsRendererProps<T> & { itemSize?: number; listClassName?: string }) {
  const flatOptions = flattenOptions(options);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: flatOptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemSize,
  });

  // Scroll to selected item on open
  React.useEffect(() => {
    if (selectedValue) {
      const index = flatOptions.findIndex((o) => o.value === selectedValue);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: 'center' });
      }
    }
  }, [selectedValue, flatOptions, virtualizer]);

  return (
    <div ref={parentRef} className={cn('max-h-[200px] overflow-auto', listClassName)}>
      <CommandGroup>
        <div style={{ height: `${virtualizer.getTotalSize()}px` }} className="relative w-full">
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const option = flatOptions[virtualItem.index];
            const isSelected = option.value === selectedValue;

            return (
              <CommandItem
                key={option.value}
                value={option.value}
                keywords={[option.label, option.description ?? '']}
                disabled={option.disabled}
                onSelect={() => onSelect(option.value)}
                className="absolute top-0 left-0 w-full cursor-pointer justify-between px-3 py-2 text-xs"
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}>
                {renderOption ? (
                  renderOption(option, isSelected)
                ) : (
                  <DefaultOptionContent option={option} isSelected={isSelected} />
                )}
              </CommandItem>
            );
          })}
        </div>
      </CommandGroup>
    </div>
  );
}

// ============================================================================
// Autocomplete (Main Component)
// ============================================================================

/**
 * Autocomplete - A searchable select component
 *
 * Standalone, form-agnostic combobox built on Popover + Command (cmdk).
 * Supports flat/grouped options, virtualization, custom rendering, and async search.
 *
 * @example Basic usage
 * ```tsx
 * <Autocomplete
 *   value={country}
 *   onValueChange={setCountry}
 *   options={countries}
 *   placeholder="Select country..."
 * />
 * ```
 *
 * @example Async search
 * ```tsx
 * <Autocomplete
 *   value={userId}
 *   onValueChange={setUserId}
 *   options={users ?? []}
 *   onSearchChange={setSearch}
 *   loading={isLoading}
 *   placeholder="Search users..."
 * />
 * ```
 */
export function Autocomplete<T extends AutocompleteOption = AutocompleteOption>({
  options,
  value,
  onValueChange,
  onSearchChange,
  searchPlaceholder = 'Search...',
  disableSearch = false,
  renderOption,
  renderValue,
  placeholder = 'Select...',
  emptyContent = 'No results found',
  footer,
  creatable = false,
  creatableLabel,
  virtualize = false,
  itemSize = 36,
  loading = false,
  disabled = false,
  name,
  id,
  className,
  triggerClassName,
  contentClassName,
  listClassName,
}: AutocompleteProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const flatOptions = React.useMemo(() => flattenOptions(options), [options]);
  const selectedOption = React.useMemo(
    () => flatOptions.find((o) => o.value === value),
    [flatOptions, value]
  );

  // When creatable and value doesn't match any option, show raw value in trigger
  const displayOption = React.useMemo(() => {
    if (selectedOption) return selectedOption;
    if (creatable && value) return { value, label: value } as T;
    return undefined;
  }, [selectedOption, creatable, value]);

  // External search mode when onSearchChange is provided
  const isExternalSearch = !!onSearchChange;

  // Creatable item visibility
  const trimmedSearch = React.useMemo(() => search.trim(), [search]);
  const showCreatableItem = React.useMemo(() => {
    if (!creatable || trimmedSearch.length === 0) return false;
    const needle = trimmedSearch.toLowerCase();
    return !flatOptions.some(
      (o) => o.value.toLowerCase() === needle || o.label.toLowerCase() === needle
    );
  }, [creatable, trimmedSearch, flatOptions]);

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      onValueChange?.(optionValue);
      setSearch('');
      setOpen(false);
    },
    [onValueChange]
  );

  const handleCreatableSelect = React.useCallback(() => {
    onValueChange?.(trimmedSearch);
    setSearch('');
    setOpen(false);
  }, [onValueChange, trimmedSearch]);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearch('');
  }, []);

  const handleSearchChange = React.useCallback(
    (val: string) => {
      setSearch(val);
      if (isExternalSearch) onSearchChange?.(val);
    },
    [isExternalSearch, onSearchChange]
  );

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={handleOpenChange} modal>
        <PopoverTrigger asChild>
          <Trigger
            selectedOption={displayOption}
            renderValue={renderValue}
            placeholder={placeholder}
            loading={loading}
            disabled={disabled}
            open={open}
            id={id}
            className={triggerClassName}
          />
        </PopoverTrigger>
        <PopoverContent
          className={cn('popover-content-width-full p-0', contentClassName)}
          align="start">
          <Command shouldFilter={!isExternalSearch} defaultValue={value}>
            {!disableSearch && (
              <CommandInput
                className="placeholder:text-secondary/60 h-7 border-none text-xs placeholder:text-xs focus-visible:ring-0"
                iconClassName="text-secondary size-3.5"
                wrapperClassName="px-3 py-2"
                placeholder={searchPlaceholder}
                value={search}
                onValueChange={handleSearchChange}
              />
            )}
            <CommandList className={cn(!virtualize && 'max-h-[300px]', listClassName)}>
              {!showCreatableItem && (
                <CommandEmpty>
                  {typeof emptyContent === 'string' ? (
                    <span className="text-muted-foreground text-xs">{emptyContent}</span>
                  ) : (
                    emptyContent
                  )}
                </CommandEmpty>
              )}

              {virtualize ? (
                <VirtualizedOptions
                  options={options}
                  selectedValue={value}
                  onSelect={handleSelect}
                  renderOption={renderOption}
                  itemSize={itemSize}
                  listClassName={listClassName}
                />
              ) : (
                <StaticOptions
                  options={options}
                  selectedValue={value}
                  onSelect={handleSelect}
                  renderOption={renderOption}
                />
              )}

              {showCreatableItem && (
                <CommandGroup forceMount className="p-0">
                  <CommandItem
                    forceMount
                    value={`\0creatable:${trimmedSearch}`}
                    keywords={[trimmedSearch]}
                    onSelect={handleCreatableSelect}
                    className="cursor-pointer px-3 py-2 text-xs">
                    {creatableLabel ? creatableLabel(trimmedSearch) : `Use "${trimmedSearch}"`}
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>

            {footer && <div className="border-t">{footer}</div>}
          </Command>
        </PopoverContent>
      </Popover>

      {/* Hidden input for non-Conform usage (plain HTML forms) */}
      {name && <input type="hidden" name={name} value={value ?? ''} />}
    </div>
  );
}

Autocomplete.displayName = 'Autocomplete';
