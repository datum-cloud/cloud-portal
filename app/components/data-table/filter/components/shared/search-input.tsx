import { Button } from '@/modules/datum-ui/components/button.tsx';
import { InputWithAddons } from '@/modules/datum-ui/components/input-with-addons.tsx';
import { cn } from '@shadcn/lib/utils';
import { Label } from '@shadcn/ui/label';
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
          containerClassName={cn(
            'h-9 focus-within:ring-0 focus-within:border-primary focus-within:ring-offset-0 transition-all',
            inputClassName
          )}
          leading={<Search size={14} className="text-muted-foreground" />}
          trailing={
            value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="text-muted-foreground hover:text-primary size-4 p-0 hover:bg-transparent">
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
