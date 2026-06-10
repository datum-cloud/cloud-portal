import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { InputWithAddons } from '@datum-cloud/datum-ui/input-with-addons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Search as SearchIconLucide, X as XIconLucide } from 'lucide-react';

export interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Standalone, controlled search input matching Table.Client's search visual
 * (`InputWithAddons` + leading search icon + trailing clear button). Unlike the
 * `TableSearchInput` inside the Table.Client toolbar — which reads/writes
 * datum-ui's DataTable store via `useDataTableSearch` — this one is fully
 * controlled, so it can drive any table's search (e.g. datum-ui's
 * `GroupedTable` controlled `search`/`onSearchChange`, with its built-in
 * toolbar disabled via `enableSearch={false}`).
 */
export function TableSearch({
  value,
  onChange,
  placeholder = 'Search',
  className,
}: TableSearchProps) {
  return (
    <div className={cn('w-full min-w-full flex-1 rounded-md sm:max-w-3xs md:min-w-80', className)}>
      <InputWithAddons
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        containerClassName="h-9 bg-transparent"
        className="placeholder:text-secondary text-secondary h-full bg-transparent text-xs placeholder:text-xs md:text-xs dark:text-white dark:placeholder:text-white"
        leading={
          <Icon
            icon={SearchIconLucide}
            size={14}
            className="text-icon-quaternary dark:text-white"
          />
        }
        trailing={
          value ? (
            <Button
              type="quaternary"
              theme="borderless"
              size="icon"
              onClick={() => onChange('')}
              className="hover:text-destructive text-icon-quaternary size-4 p-0 hover:bg-transparent dark:text-white">
              <Icon icon={XIconLucide} size={14} />
              <span className="sr-only">Clear search</span>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
