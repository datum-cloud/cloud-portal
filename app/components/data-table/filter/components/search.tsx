import { useFilter } from '../filter.context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/misc';
import { Search, X } from 'lucide-react';
import { useCallback } from 'react';

export interface SearchFilterProps {
  filterKey: string;
  label?: string;
  placeholder?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchFilter({
  filterKey,
  label,
  placeholder,
  description,
  className,
  disabled,
}: SearchFilterProps) {
  const { value, setValue, reset } = useFilter<string>(filterKey);
  const searchValue = value || '';

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
    },
    [setValue]
  );

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="space-y-1">
          <Label htmlFor={filterKey} className="text-sm font-medium">
            {label}
          </Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          id={filterKey}
          type="text"
          placeholder={placeholder || 'Search...'}
          value={searchValue}
          onChange={handleChange}
          disabled={disabled}
          className="pr-9 pl-9"
        />
        {searchValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="hover:bg-muted absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0">
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
    </div>
  );
}
