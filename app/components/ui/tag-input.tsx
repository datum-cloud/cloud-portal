import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/common';
import { X as RemoveIcon } from 'lucide-react';
import React from 'react';
import { z } from 'zod';

/**
 * used for identifying the split char and use will pasting
 */
const SPLITTER_REGEX = /[\n#?=&\t,./-]+/;

/**
 * used for formatting the pasted element for the correct value format to be added
 */
const FORMATTING_REGEX = /^[^a-zA-Z0-9]*|[^a-zA-Z0-9]*$/g;

interface TagsInputProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  minItems?: number;
  /**
   * Optional Zod schema for validating individual tag values
   */
  validator?: z.ZodType<string>;
  /**
   * Optional callback for handling validation errors externally
   * This is useful when integrating with form libraries like conform-to
   */
  onValidationError?: (error: string | null) => void;
  /**
   * Optional external error message to display
   * This is useful when the error comes from a form library like conform-to
   */
  error?: string | string[];
  /**
   * Whether to show validation errors inline
   * Set to false when handling errors externally with onValidationError
   */
  showValidationErrors?: boolean;
  name?: string;
  key?: string;
}

interface TagsInputContextProps {
  value: string[];

  onValueChange: (value: any) => void;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  validator?: z.ZodType<string>;
  validationError: string | null;
  setValidationError: React.Dispatch<React.SetStateAction<string | null>>;
}

const TagInputContext = React.createContext<TagsInputContextProps | null>(null);

export const TagsInput = React.forwardRef<HTMLDivElement, TagsInputProps>(
  (
    {
      value,
      onValueChange,
      placeholder,
      maxItems,
      minItems,
      className,
      dir,
      validator,
      onValidationError,
      error,
      showValidationErrors = true,
      name,
      key,
      ...props
    },
    ref
  ) => {
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const [inputValue, setInputValue] = React.useState('');
    const [disableInput, setDisableInput] = React.useState(false);
    const [disableButton, setDisableButton] = React.useState(false);
    const [isValueSelected, setIsValueSelected] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState('');
    const [validationError, setValidationError] = React.useState<string | null>(null);

    const parseMinItems = minItems ?? 0;
    const parseMaxItems = maxItems ?? Infinity;

    const onValueChangeHandler = React.useCallback(
      (val: string) => {
        // Reset validation error
        const setError = (errorMessage: string | null) => {
          setValidationError(errorMessage);
          if (onValidationError) {
            onValidationError(errorMessage);
          }
        };

        setError(null);

        // Skip empty values
        if (!val.trim()) return;

        // Check for duplicates and max items
        if (value.includes(val)) {
          setError('This tag already exists');
          return;
        }

        if (value.length >= parseMaxItems) {
          setError(`Maximum of ${parseMaxItems} tags allowed`);
          return;
        }

        // Validate with Zod schema if provided
        if (validator) {
          try {
            validator.parse(val);
            onValueChange([...value, val]);
          } catch (error) {
            if (error instanceof z.ZodError) {
              // Use Zod's error message directly
              setError((error as z.ZodError).issues[0]?.message || 'Invalid input');
            } else {
              setError('Validation failed');
            }
          }
        } else {
          // No validator, just add the value
          onValueChange([...value, val]);
        }
      },
      [value, validator, parseMaxItems]
    );

    const RemoveValue = React.useCallback(
      (val: string) => {
        if (value.includes(val) && value.length > parseMinItems) {
          onValueChange(value.filter((item) => item !== val));
        }
      },
      [value]
    );

    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');

        if (!pastedText) return;

        const values = pastedText
          .split(SPLITTER_REGEX)
          .map((val) => val.trim())
          .filter(Boolean)
          .map((val) => val.replace(FORMATTING_REGEX, ''));

        if (values.length === 0) return;

        // If there's only one value, treat it as a normal input
        if (values.length === 1) {
          onValueChangeHandler(values[0]);
          return;
        }

        // For multiple values, add them all if possible
        const newValues = values.filter(
          (val) => !value.includes(val) && value.length < parseMaxItems
        );

        if (newValues.length > 0) {
          onValueChange([...value, ...newValues]);
        }
      },
      [value, onValueChangeHandler]
    );

    const handleSelect = React.useCallback(
      (e: React.SyntheticEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        const selection = inputValue.substring(
          target.selectionStart ?? 0,
          target.selectionEnd ?? 0
        );

        setSelectedValue(selection);
        setIsValueSelected(selection === inputValue);
      },
      [inputValue]
    );

    React.useEffect(() => {
      const VerifyDisable = () => {
        if (value.length - 1 >= parseMinItems) {
          setDisableButton(false);
        } else {
          setDisableButton(true);
        }
        if (value.length + 1 <= parseMaxItems) {
          setDisableInput(false);
        } else {
          setDisableInput(true);
        }
      };
      VerifyDisable();
    }, [value, parseMinItems, parseMaxItems]);

    const handleKeyDown = React.useCallback(
      async (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();

        const moveNext = () => {
          const nextIndex = activeIndex + 1 > value.length - 1 ? -1 : activeIndex + 1;
          setActiveIndex(nextIndex);
        };

        const movePrev = () => {
          const prevIndex = activeIndex - 1 < 0 ? value.length - 1 : activeIndex - 1;
          setActiveIndex(prevIndex);
        };

        const moveCurrent = () => {
          const newIndex =
            activeIndex - 1 <= 0 ? (value.length - 1 === 0 ? -1 : 0) : activeIndex - 1;
          setActiveIndex(newIndex);
        };
        const target = e.currentTarget;

        switch (e.key) {
          case 'ArrowLeft': {
            if (dir === 'rtl') {
              if (value.length > 0 && activeIndex !== -1) {
                moveNext();
              }
            } else {
              if (value.length > 0 && target.selectionStart === 0) {
                movePrev();
              }
            }
            break;
          }

          case 'ArrowRight': {
            if (dir === 'rtl') {
              if (value.length > 0 && target.selectionStart === 0) {
                movePrev();
              }
            } else {
              if (value.length > 0 && activeIndex !== -1) {
                moveNext();
              }
            }
            break;
          }

          case 'Backspace':
          case 'Delete': {
            if (value.length > 0) {
              if (activeIndex !== -1 && activeIndex < value.length) {
                RemoveValue(value[activeIndex]);
                moveCurrent();
              } else {
                if (target.selectionStart === 0) {
                  if (selectedValue === inputValue || isValueSelected) {
                    RemoveValue(value[value.length - 1]);
                  }
                }
              }
            }
            break;
          }

          case 'Escape': {
            const newIndex = activeIndex === -1 ? value.length - 1 : -1;
            setActiveIndex(newIndex);
            break;
          }

          case 'Enter':
          case ',': {
            if (inputValue.trim() !== '') {
              e.preventDefault();
              onValueChangeHandler(inputValue);
              setInputValue('');
            }
            break;
          }
        }
      },
      [
        activeIndex,
        value,
        inputValue,
        RemoveValue,
        dir,
        selectedValue,
        isValueSelected,
        onValueChangeHandler,
      ]
    );

    const mousePreventDefault = React.useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.currentTarget.value);
    }, []);

    const contextValue = React.useMemo(
      () => ({
        value,
        onValueChange,
        inputValue,
        setInputValue,
        activeIndex,
        setActiveIndex,
        validator,
        validationError,
        setValidationError,
      }),
      [value, onValueChange, inputValue, activeIndex, validator, validationError]
    );

    return (
      <TagInputContext.Provider value={contextValue}>
        <div
          {...props}
          ref={ref}
          dir={dir}
          className={cn(
            'bg-background ring-offset-background flex min-h-10 flex-wrap items-center gap-1 overflow-hidden rounded-md border px-3 py-1',
            {
              'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-hidden':
                activeIndex === -1,
            },
            className
          )}>
          {/* Show validation errors if enabled or show external errors */}
          {((showValidationErrors && validationError) || error) && (
            <div className="mb-1 w-full text-sm text-red-500">
              {error ? (Array.isArray(error) ? error[0] : error) : validationError}
            </div>
          )}

          {value.map((item, index) => (
            <Badge
              tabIndex={activeIndex !== -1 ? 0 : activeIndex}
              key={item}
              aria-disabled={disableButton}
              data-active={activeIndex === index}
              className={cn(
                "data-[active='true']:ring-muted-foreground relative flex items-center gap-1 truncate rounded px-1 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[active='true']:ring-2"
              )}
              variant={'secondary'}>
              <span className="text-xs">{item}</span>
              <button
                type="button"
                aria-label={`Remove ${item} option`}
                aria-roledescription="button to remove option"
                disabled={disableButton}
                onMouseDown={mousePreventDefault}
                onClick={() => RemoveValue(item)}
                className="disabled:cursor-not-allowed">
                <span className="sr-only">Remove {item} option</span>
                <RemoveIcon className="hover:stroke-destructive h-4 w-4" />
              </button>
            </Badge>
          ))}
          <Input
            tabIndex={0}
            aria-label="input tag"
            disabled={disableInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            value={inputValue}
            onSelect={handleSelect}
            onChange={activeIndex === -1 ? handleChange : undefined}
            placeholder={placeholder}
            onClick={() => setActiveIndex(-1)}
            className={cn(
              'placeholder:text-muted-foreground border-input h-6 min-w-fit flex-1 border-none p-0 py-1 outline-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-0',
              activeIndex !== -1 && 'caret-transparent'
            )}
          />
        </div>
        {/* Hidden input for form submission */}
        <select
          name={name}
          id={props.id}
          key={key}
          multiple
          value={value}
          defaultValue={undefined}
          className="absolute top-0 left-0 h-0 w-0"
          onChange={() => undefined}>
          <option value=""></option>
          {value.map((option, idx) => (
            <option key={`${option}-${idx}`} value={option} />
          ))}
        </select>
      </TagInputContext.Provider>
    );
  }
);

TagsInput.displayName = 'TagsInput';
