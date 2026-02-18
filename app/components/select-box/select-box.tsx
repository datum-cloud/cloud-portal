import { LoaderOverlay } from '@datum-ui/components/loader-overlay';
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
import { CheckIcon, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/**
 * Represents a single option in a SelectBox dropdown
 *
 * @example
 * ```tsx
 * const option: SelectBoxOption = {
 *   value: 'admin',
 *   label: 'Administrator',
 *   description: 'Full access to all resources',
 *   disabled: false
 * };
 * ```
 */
export interface SelectBoxOption {
  /** Unique identifier for the option - used in form submission */
  value: string;

  /** Display text shown in the dropdown and button */
  label: string;

  /** Whether the option is disabled and cannot be selected */
  disabled?: boolean;

  /** Optional description text shown below the label in the dropdown */
  description?: string;

  /** Additional custom properties can be stored here */
  [key: string]: any;
}

/**
 * Groups options together with a heading for better organization
 *
 * @example
 * ```tsx
 * const group: SelectBoxGroup = {
 *   label: 'Database Access',
 *   options: [
 *     { value: 'db-read', label: 'Read Only' },
 *     { value: 'db-write', label: 'Read/Write' }
 *   ]
 * };
 * ```
 */
export interface SelectBoxGroup {
  /** The heading text for this group */
  label: string;

  /** Array of options to display under this group heading */
  options: SelectBoxOption[];
}

/**
 * A customizable dropdown/select component with support for grouping, search, and descriptions
 *
 * Features:
 * - Single or multi-select modes
 * - Group options with category headings
 * - Case-insensitive search/filtering
 * - Optional descriptions under each option
 * - Disabled option support
 * - Custom styling via className
 *
 * @example
 * ```tsx
 * // Single-select with grouped options
 * <SelectBox
 *   value={selectedRole}
 *   onChange={(option) => setSelectedRole(option)}
 *   groups={[
 *     {
 *       label: 'Admin Roles',
 *       options: [
 *         { value: 'admin', label: 'Administrator', description: 'Full access' }
 *       ]
 *     }
 *   ]}
 *   placeholder="Select a role"
 * />
 *
 * // Simple single-select with flat options
 * <SelectBox
 *   value={selectedProject}
 *   onChange={(option) => setSelectedProject(option)}
 *   options={projects}
 *   placeholder="Select a project"
 * />
 * ```
 */
export const SelectBox = ({
  value,
  className,
  onChange,
  options,
  groups,
  name,
  id,
  placeholder = 'Select an option',
  disabled = false,
  isLoading = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  itemPreview,
  triggerClassName,
  popoverClassName,
  emptyContent = 'No results found.',
  modal = false,
}: {
  /** Currently selected option value (for single-select mode) */
  value?: string;

  /** Callback fired when a single option is selected */
  onChange?: (value: SelectBoxOption) => void;

  /** Flat array of options - use this OR groups, not both */
  options?: SelectBoxOption[];

  /** Array of grouped options - use this OR options, not both */
  groups?: SelectBoxGroup[];

  /** HTML name attribute for the hidden form select element */
  name?: string;

  /** HTML id attribute for the hidden form select element */
  id?: string;

  /** Placeholder text shown when no option is selected */
  placeholder?: string;

  /** Disable the entire select box */
  disabled?: boolean;

  /** Show loading spinner in the button */
  isLoading?: boolean;

  /** Enable search/filter functionality for options (default: false) */
  searchable?: boolean;

  /** Placeholder text for the search input (only used when searchable is true) */
  searchPlaceholder?: string;

  /** Custom render function for option preview in the trigger */
  itemPreview?: (option: SelectBoxOption) => React.ReactNode;
  /** Optional classes applied to both trigger and popover when more specific classes are not provided */
  className?: string;
  /** Optional classes applied to the trigger button */
  triggerClassName?: string;
  /** Optional classes applied to the popover content */
  popoverClassName?: string;
  /** Optional content to display when no options are found */
  emptyContent?: string;
  /** Whether the popover should be modal */
  modal?: boolean;
}) => {
  const triggerClasses = triggerClassName ?? className;
  const popoverClasses = popoverClassName ?? className;
  const [open, setOpen] = useState(false);
  const [initValue, setInitValue] = useState(value);

  // Flatten all options from groups and regular options
  const allOptions = useMemo(() => {
    const flatOptions: SelectBoxOption[] = [];
    if (groups) {
      groups.forEach((group) => {
        flatOptions.push(...group.options);
      });
    }
    if (options) {
      flatOptions.push(...options);
    }
    return flatOptions;
  }, [groups, options]);

  const selectedValue = useMemo(() => {
    if (!initValue) return undefined;
    return allOptions.find((option) => option.value === initValue);
  }, [initValue, allOptions]);

  useEffect(() => {
    if (value) {
      setInitValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (selectedValue && onChange) {
      onChange(selectedValue);
    }
  }, [selectedValue, onChange]);

  const previewHandler = (
    option: SelectBoxOption,
    className?: string,
    showDescription = false
  ): React.ReactNode => {
    return itemPreview ? (
      itemPreview(option)
    ) : showDescription && option.description ? (
      <div className="flex w-full flex-col gap-0.5 text-left">
        <span title={option.label} className={cn(className, 'text-left')}>
          {option.label}
        </span>
        <span className="text-muted-foreground line-clamp-2 text-left text-xs">
          {option.description}
        </span>
      </div>
    ) : (
      <span className={className} title={option.label}>
        {option.label}
      </span>
    );
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen} modal={modal}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || isLoading}
            role="combobox"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cn(
              'text-input-foreground placeholder:text-input-placeholder',
              'border-input-border bg-input-background/50 relative flex h-auto! min-h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all',
              'focus-visible:border-input-focus-border focus-visible:shadow-(--input-focus-shadow)',
              'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden',
              (disabled || isLoading) && 'cursor-not-allowed opacity-50',
              triggerClasses
            )}>
            <div className="flex w-full flex-col gap-0.5 pr-6">
              {selectedValue ? (
                previewHandler(selectedValue, 'line-clamp-1 text-ellipsis', true)
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2" />
            {isLoading && <LoaderOverlay />}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('popover-content-width-full p-0', popoverClasses)}
          align="center"
          onEscapeKeyDown={() => setOpen(false)}>
          <Command shouldFilter={true}>
            {searchable && <CommandInput placeholder={searchPlaceholder} />}
            <CommandList>
              {searchable && <CommandEmpty>{emptyContent}</CommandEmpty>}
              {allOptions.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto">
                  {groups && groups.length > 0 ? (
                    // Render grouped options
                    groups.map((group, index) => (
                      <CommandGroup
                        key={group.label}
                        heading={group.label}
                        className={index > 0 ? 'border-t pt-2' : ''}>
                        {group.options.map((option: SelectBoxOption) => {
                          const isSelected = selectedValue?.value === option.value;
                          return (
                            <CommandItem
                              value={option.value}
                              key={option.value}
                              onSelect={() => {
                                setInitValue(option.value);
                                setOpen(false);
                              }}
                              disabled={option.disabled}
                              className="flex! flex-col! items-start!">
                              <div className="flex w-full items-center justify-start gap-2">
                                {previewHandler(option)}
                                {isSelected && (
                                  <CheckIcon className="text-primary ml-auto size-4 shrink-0" />
                                )}
                              </div>
                              {option.description && (
                                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                  {option.description}
                                </p>
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    ))
                  ) : (
                    // Render flat options
                    <CommandGroup>
                      {options?.map((option: SelectBoxOption) => {
                        const isSelected = selectedValue?.value === option.value;
                        return (
                          <CommandItem
                            value={option.value}
                            key={option.value}
                            onSelect={() => {
                              setInitValue(option.value);
                              setOpen(false);
                            }}
                            disabled={option.disabled}
                            className="flex! flex-col! items-start!">
                            <div className="flex w-full items-center justify-start gap-2">
                              {previewHandler(option)}
                              {isSelected && (
                                <CheckIcon className="text-primary ml-auto size-4 shrink-0" />
                              )}
                            </div>
                            {option.description && (
                              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                {option.description}
                              </p>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </div>
              ) : (
                <CommandItem disabled className="px-4 py-2.5">
                  <span className="text-xs">{emptyContent}</span>
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Hidden input for form submission */}
      <select
        aria-hidden={true}
        multiple={false}
        name={name}
        id={id}
        value={selectedValue?.value ?? ''}
        defaultValue={undefined}
        className="absolute top-0 left-0 h-0 w-0"
        onChange={() => undefined}>
        <option value=""></option>
        {allOptions.map((option, idx) => (
          <option key={`${option.value}-${idx}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
};
