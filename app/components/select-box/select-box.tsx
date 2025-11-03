import { Button } from '@datum-ui/components';
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
import { CheckIcon, ChevronDown, Loader2 } from 'lucide-react';
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
  placeholder = 'Select a option',
  disabled = false,
  isLoading = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  itemPreview,
}: {
  /** Currently selected option value (for single-select mode) */
  value?: string;

  /** CSS class name for custom styling */
  className?: string;

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

  /** Custom render function for option preview in the button */
  itemPreview?: (option: SelectBoxOption) => React.ReactNode;
}) => {
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            disabled={disabled || isLoading}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="relative !h-auto w-full p-0">
            <div className="flex w-full flex-col items-start px-3 py-2 pr-10 text-left">
              {selectedValue
                ? previewHandler(selectedValue, 'line-clamp-1 text-ellipsis', true)
                : placeholder}
            </div>
            <ChevronDown className="absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-50" />
            {isLoading && (
              <Loader2 className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 animate-spin" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('popover-content-width-full p-0', className)}
          align="center"
          onEscapeKeyDown={() => setOpen(false)}>
          <Command shouldFilter={true}>
            {searchable && <CommandInput placeholder={searchPlaceholder} />}
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {allOptions.length > 0 && (
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
                              className="!flex !flex-col !items-start">
                              <div className="flex w-full items-center justify-start gap-2">
                                {previewHandler(option)}
                                {isSelected && (
                                  <CheckIcon className="text-primary ml-auto size-4 flex-shrink-0" />
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
                            className="!flex !flex-col !items-start">
                            <div className="flex w-full items-center justify-start gap-2">
                              {previewHandler(option)}
                              {isSelected && (
                                <CheckIcon className="text-primary ml-auto size-4 flex-shrink-0" />
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
