// src/components/multi-select.tsx
import { Badge } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@shadcn/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { Separator } from '@shadcn/ui/separator';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckIcon, XCircle, ChevronDown, XIcon, WandSparkles, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useEffect } from 'react';

/**
 * Variants for the multi-select component to handle different styles.
 * Uses class-variance-authority (cva) to define different styles based on "variant" prop.
 */
const multiSelectVariants = cva(
  'm-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-105 duration-300 whitespace-normal break-words',
  {
    variants: {
      variant: {
        default: 'border-foreground/10 text-foreground bg-card hover:bg-card/80',
        secondary:
          'border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        inverted: 'inverted',
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
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof multiSelectVariants> {
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
          <Button
            disabled={disabled || isLoading}
            data-slot="multi-select-trigger"
            onClick={handleTogglePopover}
            className={cn(
              'relative flex h-auto min-h-10 w-full items-center justify-between rounded-md border bg-inherit p-1 hover:bg-inherit [&_svg]:pointer-events-auto',
              className
            )}>
            {currentSelectedValues.length > 0 && !isLoading && options.length > 0 ? (
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-wrap items-center">
                  {currentSelectedValues
                    .slice(0, maxCount === -1 ? undefined : maxCount)
                    .map((value) => {
                      const option = options.find((o) => o.value === value);
                      const IconComponent = option?.icon;
                      return (
                        <Badge
                          key={value}
                          className={cn(
                            isAnimating ? 'animate-bounce' : '',
                            multiSelectVariants({ variant }),
                            clickableBadges && 'cursor-pointer',
                            badgeClassName ?? ''
                          )}
                          style={{ animationDuration: `${animation}s` }}
                          onClick={(event) => {
                            if (clickableBadges) {
                              event.stopPropagation();
                              event.preventDefault();
                              onBadgeClick?.(option ?? { label: '', value: '' });
                            }
                          }}>
                          {IconComponent && <IconComponent className="mr-2 size-4" />}
                          {option?.label}
                          <XCircle
                            className="ml-2 size-4 cursor-pointer"
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
                        'border-foreground/1 text-foreground bg-transparent hover:bg-transparent',
                        isAnimating ? 'animate-bounce' : '',
                        multiSelectVariants({ variant })
                      )}
                      style={{ animationDuration: `${animation}s` }}>
                      {`+ ${currentSelectedValues.length - maxCount} more`}
                      <XCircle
                        className="ml-2 size-4 cursor-pointer"
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
              <div className="mx-auto flex w-full items-center justify-between">
                <span className="text-muted-foreground mx-3 text-sm">{placeholder}</span>
                <ChevronDown className="text-muted-foreground mx-2 h-4 cursor-pointer" />
              </div>
            )}

            {isLoading && (
              <div className="bg-background/20 absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-md backdrop-blur-xs">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('popover-content-width-full min-w-[300px] p-0', boxClassName)}
          align="start"
          onEscapeKeyDown={() => setIsPopoverOpen(false)}>
          <Command>
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {options.length > 0 && (
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
