// src/components/multi-select.tsx
import { LoaderOverlay } from '@/components/loader-overlay/loader-overlay';
import { Badge } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@shadcn/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { Separator } from '@shadcn/ui/separator';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckIcon, XCircle, ChevronDown, XIcon, WandSparkles } from 'lucide-react';
import * as React from 'react';
import { useEffect } from 'react';

/**
 * Variants for the multi-select component to handle different styles.
 * Uses class-variance-authority (cva) to define different styles based on "variant" prop.
 */
const multiSelectVariants = cva(
  'flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-input-border bg-input-background/80 text-input-foreground',
        secondary: 'border-secondary/40 bg-secondary/20 text-secondary-foreground',
        destructive: 'border-destructive/60 bg-destructive/20 text-destructive',
        inverted: 'border-transparent bg-foreground text-background',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Props for MultiSelect component
 */

export interface MultiSelectOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MultiSelectProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof multiSelectVariants> {
  /**
   * An array of option objects to be displayed in the multi-select component.
   * Each option object has a label, value, and an optional icon.
   */
  options: MultiSelectOption[];

  /**
   * Callback function triggered when the selected values change.
   * Receives an array of the new selected values.
   */
  onValueChange: (value: string[]) => void;

  /** The default selected values when the component mounts. */
  defaultValue?: string[];

  /** The controlled selected values. When provided, component becomes controlled. */
  value?: string[];

  /**
   * Placeholder text to be displayed when no values are selected.
   * Optional, defaults to "Select options".
   */
  placeholder?: string;

  /**
   * Animation duration in seconds for the visual effects (e.g., bouncing badges).
   * Optional, defaults to 0 (no animation).
   */
  animation?: number;

  /**
   * Maximum number of items to display. Extra selected items will be summarized.
   * Set to -1 for unlimited items.
   * Optional, defaults to 3.
   */
  maxCount?: number | -1;

  /**
   * The modality of the popover. When set to true, interaction with outside elements
   * will be disabled and only popover content will be visible to screen readers.
   * Optional, defaults to false.
   */
  modalPopover?: boolean;

  /**
   * If true, renders the multi-select component as a child of another component.
   * Optional, defaults to false.
   */
  asChild?: boolean;

  /**
   * Additional class names to apply custom styles to the multi-select component.
   * Optional, can be used to add custom styles.
   */
  className?: string;

  /**
   * Additional class names to apply custom styles to the box container.
   * Optional, can be used to add custom styles to the box wrapper.
   */
  boxClassName?: string;

  /**
   * Custom actions to be displayed in the multi-select popover.
   * Each action should have a label and an onClick handler.
   * Optional array of custom actions.
   */
  actions?: Array<{
    /** The label text to display for the action */
    label: string;
    /** Click handler for the action */
    onClick: () => void;
    /** Optional icon component to display alongside the action */
    icon?: React.ComponentType<{ className?: string }>;
    /** Optional class name for custom styling */
    className?: string;
  }>;

  /**
   * Callback function triggered when a selected badge is clicked.
   * Receives the value of the clicked badge as a parameter.
   * Optional, can be used to handle badge click interactions.
   */
  onBadgeClick?: (option: MultiSelectOption) => void;

  badgeClassName?: string;

  /**
   * Determines if badges should be clickable.
   * When true, badges will have hover and click interactions.
   * Optional, defaults to false.
   */
  clickableBadges?: boolean;

  /**
   * Controls the visibility of the close (X) button in the popover.
   * When false, the close button will be hidden.
   * Optional, defaults to true.
   */
  showCloseButton?: boolean;

  /**
   * Determines if the clear button should be shown in the popover.
   * When false, the clear button will be hidden.
   * Optional, defaults to true.
   */
  showClearButton?: boolean;

  /**
   * Controls whether to show the "Select All" option in the popover.
   * When true, a "Select All" option will be displayed at the top of the options list.
   * Optional, defaults to false.
   */
  showSelectAll?: boolean;

  /**
   * Controls whether the component is loading.
   * When true, the component will show a loading indicator.
   * Optional, defaults to false.
   */
  isLoading?: boolean;

  /**
   * The content to display when no options are found.
   * Optional, defaults to "No options found.".
   */
  emptyContent?: string;
}

export const MultiSelect = ({
  options,
  onValueChange,
  variant,
  defaultValue = [],
  value,
  placeholder = 'Select options',
  animation = 0,
  maxCount = 3,
  modalPopover = false,

  className,
  boxClassName,
  actions,
  onBadgeClick,
  badgeClassName,
  clickableBadges = false,
  showCloseButton = true,
  showClearButton = true,
  showSelectAll = false,
  disabled = false,
  id,
  name,
  isLoading = false,
  emptyContent = 'No results found.',
}: MultiSelectProps) => {
  const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue);

  // Use controlled value if provided, otherwise use internal state
  const currentSelectedValues = value !== undefined ? value : selectedValues;
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const toggleOption = (option: string) => {
    const newSelectedValues = currentSelectedValues.includes(option)
      ? currentSelectedValues.filter((value) => value !== option)
      : [...currentSelectedValues, option];

    // Only update internal state if not controlled
    if (value === undefined) {
      setSelectedValues(newSelectedValues);
    }
    onValueChange(newSelectedValues);
  };

  const handleClear = () => {
    if (value === undefined) {
      setSelectedValues([]);
    }
    onValueChange([]);
  };

  const handleTogglePopover = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  const clearExtraOptions = () => {
    const newSelectedValues = currentSelectedValues.slice(0, maxCount);
    if (value === undefined) {
      setSelectedValues(newSelectedValues);
    }
    onValueChange(newSelectedValues);
  };

  const toggleAll = () => {
    if (currentSelectedValues.length === options.length) {
      handleClear();
    } else {
      const allValues = options.map((option) => option.value);
      if (value === undefined) {
        setSelectedValues(allValues);
      }
      onValueChange(allValues);
    }
  };

  // Only sync defaultValue to internal state when uncontrolled
  useEffect(() => {
    if (value === undefined && defaultValue) {
      setSelectedValues(defaultValue);
    }
  }, [defaultValue, value]);

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen} modal={modalPopover}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || isLoading}
            data-slot="multi-select-trigger"
            onClick={handleTogglePopover}
            className={cn(
              'text-input-foreground placeholder:text-input-placeholder',
              'border-input-border bg-input-background/50 relative flex min-h-10 w-full items-center justify-between rounded-lg border px-2 py-1 text-left text-sm transition-all',
              'focus-visible:border-input-focus-border focus-visible:shadow-(--input-focus-shadow)',
              'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden',
              (disabled || isLoading) && 'cursor-not-allowed opacity-50',
              className
            )}>
            {currentSelectedValues.length > 0 && !isLoading && options.length > 0 ? (
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {currentSelectedValues
                    .slice(0, maxCount === -1 ? undefined : maxCount)
                    .map((value) => {
                      const option = options.find((o) => o.value === value);
                      const IconComponent = option?.icon;
                      return (
                        <Badge
                          key={value}
                          className={cn(
                            multiSelectVariants({ variant }),
                            'truncate',
                            isAnimating && 'animate-bounce',
                            clickableBadges && 'cursor-pointer',
                            badgeClassName
                          )}
                          style={{ animationDuration: `${animation}s` }}
                          onClick={(event) => {
                            if (clickableBadges) {
                              event.stopPropagation();
                              event.preventDefault();
                              onBadgeClick?.(option ?? { label: '', value: '' });
                            }
                          }}>
                          {IconComponent && (
                            <IconComponent className="text-muted-foreground size-3" />
                          )}
                          <span className="max-w-[120px] truncate">{option?.label}</span>
                          <XCircle
                            className="text-muted-foreground ml-1 size-3 cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                              toggleOption(value);
                            }}
                          />
                        </Badge>
                      );
                    })}
                  {currentSelectedValues.length > maxCount && maxCount !== -1 && (
                    <Badge
                      className={cn(
                        multiSelectVariants({ variant }),
                        'text-muted-foreground',
                        isAnimating && 'animate-bounce'
                      )}
                      style={{ animationDuration: `${animation}s` }}>
                      {`+ ${currentSelectedValues.length - maxCount} more`}
                      <XCircle
                        className="text-muted-foreground ml-1 size-3 cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearExtraOptions();
                        }}
                      />
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <XIcon
                    className="text-muted-foreground mx-2 h-4 cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleClear();
                    }}
                  />
                  <Separator orientation="vertical" className="flex h-full min-h-6" />
                  <ChevronDown className="text-muted-foreground mx-2 h-4 cursor-pointer" />
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between px-2">
                <span className="text-muted-foreground text-sm">{placeholder}</span>
                <ChevronDown className="text-muted-foreground mx-1 h-4 cursor-pointer" />
              </div>
            )}

            {isLoading && <LoaderOverlay className="rounded-lg" />}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('popover-content-width-full min-w-[300px] p-0', boxClassName)}
          align="start"
          onEscapeKeyDown={() => setIsPopoverOpen(false)}>
          <Command>
            <CommandList>
              {options.length > 0 ? (
                <CommandGroup className="max-h-[250px] overflow-y-auto">
                  {showSelectAll && (
                    <CommandItem key="all" onSelect={toggleAll} className="cursor-pointer">
                      <div
                        className={cn(
                          'border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
                          currentSelectedValues.length === options.length
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible'
                        )}>
                        <CheckIcon className="size-4" />
                      </div>
                      <span>(Select All)</span>
                    </CommandItem>
                  )}
                  {options.map((option) => {
                    const isSelected = currentSelectedValues.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => toggleOption(option.value)}
                        className="cursor-pointer">
                        <div
                          className={cn(
                            'border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible'
                          )}>
                          <CheckIcon className="text-background size-4" />
                        </div>
                        {option.icon && (
                          <option.icon className="text-muted-foreground mr-2 size-4" />
                        )}
                        <span>{option.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : (
                <CommandItem disabled className="px-4 py-2.5">
                  <span className="text-xs">{emptyContent}</span>
                </CommandItem>
              )}
              {actions && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    {actions.map((action) => (
                      <CommandItem
                        key={action.label}
                        onSelect={action.onClick}
                        className={action.className}>
                        {action.icon && (
                          <action.icon className="text-muted-foreground mr-2 size-4" />
                        )}
                        {action.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {showCloseButton || (showClearButton && currentSelectedValues.length > 0) ? (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <div className="flex items-center justify-between">
                      {showClearButton && currentSelectedValues.length > 0 && (
                        <>
                          <CommandItem
                            onSelect={handleClear}
                            className="flex-1 cursor-pointer justify-center">
                            Clear
                          </CommandItem>
                          {showCloseButton && (
                            <Separator orientation="vertical" className="flex h-full min-h-6" />
                          )}
                        </>
                      )}
                      {showCloseButton && (
                        <CommandItem
                          onSelect={() => setIsPopoverOpen(false)}
                          className="max-w-full flex-1 cursor-pointer justify-center">
                          Close
                        </CommandItem>
                      )}
                    </div>
                  </CommandGroup>
                </>
              ) : (
                <></>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
        {animation > 0 && currentSelectedValues.length > 0 && (
          <WandSparkles
            className={cn(
              'bg-background text-foreground my-2 h-3 w-3 cursor-pointer',
              isAnimating ? '' : 'text-muted-foreground'
            )}
            onClick={() => setIsAnimating(!isAnimating)}
          />
        )}
      </Popover>
      {/* Hidden input for form submission */}
      <select
        name={name}
        id={id}
        multiple
        value={currentSelectedValues ?? []}
        defaultValue={undefined}
        className="absolute top-0 left-0 h-0 w-0"
        onChange={() => undefined}>
        <option value=""></option>
        {options.map((option, idx) => (
          <option key={`${option.value}-${idx}`} value={option.value} />
        ))}
      </select>
    </>
  );
};

MultiSelect.displayName = 'MultiSelect';
