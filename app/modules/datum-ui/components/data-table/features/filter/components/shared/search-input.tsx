import { Button } from '@datum-ui/components';
import { InputWithAddons } from '@datum-ui/components';
import { Label } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Search, X } from 'lucide-react';

/**
 * Shared search input UI component
 * Used by both Search and GlobalSearch components
 */
export interface SearchInputProps {
  id?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  placeholder?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export function SearchInput({
  id,
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  label,
  description,
  disabled = false,
  className,
  inputClassName,
}: SearchInputProps) {
  return (
    <div className={cn('min-w-60 space-y-2', className)}>
      {label && (
        <div className="space-y-1">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}

      <div className="relative">
        <InputWithAddons
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          containerClassName={cn('h-9 bg-transparent', inputClassName)}
          className="placeholder:text-secondary text-secondary h-full bg-transparent text-sm placeholder:text-sm dark:text-white dark:placeholder:text-white"
          leading={<Search size={14} className="text-icon-quaternary dark:text-white" />}
          trailing={
            value && (
              <Button
                type="quaternary"
                theme="borderless"
                size="icon"
                onClick={onClear}
                className="hover:text-destructive text-icon-quaternary size-4 p-0 hover:bg-transparent dark:text-white">
                <X size={14} />
                <span className="sr-only">Clear search</span>
              </Button>
            )
          }
        />
      </div>
    </div>
  );
}
