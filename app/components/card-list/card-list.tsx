import { Button } from '@datum-cloud/datum-ui/button';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { InputWithAddons } from '@datum-cloud/datum-ui/input-with-addons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@datum-cloud/datum-ui/table';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Search as SearchIconLucide, X as XIconLucide } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

// =============================================================================
// Types
// =============================================================================

export type CardListAction = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  variant?: 'default' | 'destructive' | 'outline';
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
};

export type CardListEmptyConfig = {
  title: string;
  action?: CardListAction;
};

type SearchFn<TData> = (item: TData, query: string) => boolean;

type CardListContextValue<TData = unknown> = {
  data: readonly TData[];
  getId: (item: TData) => string;
  loading?: boolean;
  error?: Error | string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchFn: SearchFn<TData> | null;
  registerSearchFn: (fn: SearchFn<TData> | null) => void;
  emptyConfig: CardListEmptyConfig | null;
  registerEmptyConfig: (c: CardListEmptyConfig | null) => void;
  filteredData: readonly TData[];
};

const CardListContext = createContext<CardListContextValue | null>(null);

function useCardListContext<TData>(): CardListContextValue<TData> {
  const ctx = useContext(CardListContext);
  if (!ctx) {
    throw new Error('<CardList.*> subcomponents must be rendered inside <CardList>');
  }
  return ctx as CardListContextValue<TData>;
}

// =============================================================================
// CardList root
// =============================================================================

export interface CardListProps<TData> extends HTMLAttributes<HTMLDivElement> {
  data: readonly TData[];
  getId: (item: TData) => string;
  loading?: boolean;
  error?: Error | string | null;
  children?: ReactNode;
}

function CardListRoot<TData>({
  data,
  getId,
  loading,
  error,
  children,
  className,
  ...rest
}: CardListProps<TData>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFn, setSearchFn] = useState<SearchFn<TData> | null>(null);
  const [emptyConfig, setEmptyConfig] = useState<CardListEmptyConfig | null>(null);

  const registerSearchFn = useCallback((fn: SearchFn<TData> | null) => {
    setSearchFn(() => fn);
  }, []);

  const registerEmptyConfig = useCallback((c: CardListEmptyConfig | null) => {
    setEmptyConfig(c);
  }, []);

  const filteredData = useMemo(() => {
    if (!searchFn || searchQuery === '') return data;
    return data.filter((item) => searchFn(item, searchQuery));
  }, [data, searchFn, searchQuery]);

  const ctxValue: CardListContextValue<TData> = useMemo(
    () => ({
      data,
      getId,
      loading,
      error,
      searchQuery,
      setSearchQuery,
      searchFn,
      registerSearchFn,
      emptyConfig,
      registerEmptyConfig,
      filteredData,
    }),
    [
      data,
      getId,
      loading,
      error,
      searchQuery,
      searchFn,
      registerSearchFn,
      emptyConfig,
      registerEmptyConfig,
      filteredData,
    ]
  );

  return (
    <CardListContext.Provider value={ctxValue as unknown as CardListContextValue}>
      <div className={cn('space-y-4', className)} {...rest}>
        {children}
      </div>
    </CardListContext.Provider>
  );
}

// =============================================================================
// CardList.Header
// =============================================================================

export interface CardListHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

function CardListHeader({
  title,
  description,
  actions,
  children,
  className,
  ...rest
}: CardListHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-5', className)} {...rest}>
      <PageTitle title={title} description={description} />
      {(children || actions) && (
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {children && (
            <div className="flex w-full min-w-0 flex-1 items-center gap-3 sm:w-auto">
              {children}
            </div>
          )}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CardList.Toolbar
// =============================================================================

export interface CardListToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

function CardListToolbar({ children, className, ...rest }: CardListToolbarProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3',
        className
      )}
      {...rest}>
      {children}
    </div>
  );
}

// =============================================================================
// CardList.Search
// =============================================================================

export interface CardListSearchProps<TData> extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  placeholder?: string;
  fields?: (keyof TData)[];
  searchFn?: SearchFn<TData>;
  filterKey?: string;
}

function CardListSearch<TData>({
  placeholder = 'Search',
  fields,
  searchFn: consumerSearchFn,
  filterKey = 'q',
  className,
  ...rest
}: CardListSearchProps<TData>) {
  const { setSearchQuery, registerSearchFn } = useCardListContext<TData>();
  const [urlValue, setUrlValue] = useQueryState(filterKey, parseAsString.withDefault(''));

  // Sync URL value → provider
  useEffect(() => {
    setSearchQuery(urlValue);
  }, [urlValue, setSearchQuery]);

  // Stabilize the derived search fn so inline `fields={[...]}` literals from
  // consumers don't thrash the register-search-fn effect on every render.
  const fieldsKey = fields?.join('|') ?? '';
  const derivedSearchFn = useMemo<SearchFn<TData> | null>(() => {
    if (consumerSearchFn) return consumerSearchFn;
    if (!fields || fields.length === 0) return null;
    const capturedFields = fields;
    return (item, query) => {
      const q = query.toLowerCase();
      return capturedFields.some((f) => {
        const value = (item as Record<string, unknown>)[f as string];
        return typeof value === 'string' && value.toLowerCase().includes(q);
      });
    };
    // fieldsKey captures field content; `fields` reference identity is intentionally excluded
  }, [consumerSearchFn, fieldsKey]);

  useEffect(() => {
    registerSearchFn(derivedSearchFn);
    return () => registerSearchFn(null);
  }, [derivedSearchFn, registerSearchFn]);

  return (
    <div className="w-full min-w-full flex-1 space-y-4 rounded-md sm:max-w-md md:min-w-80">
      <InputWithAddons
        type="text"
        placeholder={placeholder}
        value={urlValue}
        onChange={(e) => setUrlValue(e.target.value || null)}
        containerClassName={cn('h-9 bg-transparent', className)}
        className="placeholder:text-secondary text-secondary h-full bg-transparent text-xs placeholder:text-xs md:text-xs dark:text-white dark:placeholder:text-white"
        leading={
          <Icon
            icon={SearchIconLucide}
            size={14}
            className="text-icon-quaternary dark:text-white"
          />
        }
        trailing={
          urlValue ? (
            <Button
              type="quaternary"
              theme="borderless"
              size="icon"
              onClick={() => setUrlValue(null)}
              className="hover:text-destructive text-icon-quaternary size-4 p-0 hover:bg-transparent dark:text-white">
              <Icon icon={XIconLucide} size={14} />
              <span className="sr-only">Clear search</span>
            </Button>
          ) : undefined
        }
        {...rest}
      />
    </div>
  );
}

// =============================================================================
// CardList.Items
// =============================================================================

export interface CardListItemsProps<TData> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  renderCard: (item: TData) => ReactNode;
  cardClassName?: string | ((item: TData) => string | undefined);
  cardProps?: HTMLAttributes<HTMLDivElement> | ((item: TData) => HTMLAttributes<HTMLDivElement>);
  onSelect?: (item: TData) => void;
  skeletonCount?: number;
}

function resolveCardClassName<TData>(
  cardClassName: CardListItemsProps<TData>['cardClassName'],
  item: TData
): string | undefined {
  if (!cardClassName) return undefined;
  return typeof cardClassName === 'function' ? cardClassName(item) : cardClassName;
}

function resolveCardProps<TData>(
  cardProps: CardListItemsProps<TData>['cardProps'],
  item: TData
): HTMLAttributes<HTMLDivElement> {
  if (!cardProps) return {};
  return typeof cardProps === 'function' ? cardProps(item) : cardProps;
}

function CardListItems<TData>({
  renderCard,
  cardClassName,
  cardProps,
  onSelect,
  skeletonCount = 5,
  className,
  ...rest
}: CardListItemsProps<TData>) {
  const { filteredData, loading, error, searchQuery, emptyConfig, getId } =
    useCardListContext<TData>();

  if (loading) {
    return (
      <div className={className} {...rest}>
        <Table>
          <TableBody>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              // class strings from data-table-loading.tsx DataTableLoadingCardSkeleton
              <TableRow key={i} className="relative border-none hover:bg-transparent">
                <TableCell className="p-0 pb-4">
                  <div className="bg-card flex h-[80px] items-center rounded-lg border shadow-none">
                    <div className="w-full p-[24px]">
                      <div className="flex w-full flex-col items-start justify-start gap-4 md:flex-row md:items-center md:justify-between md:gap-2">
                        <div className="flex items-center gap-5">
                          <Skeleton className="size-4 shrink-0 rounded-md" />
                          <Skeleton className="h-5 w-48 max-w-full rounded-md" />
                        </div>
                        <div className="flex w-full items-center justify-between gap-6 md:w-auto">
                          <Skeleton className="h-6 w-36 rounded-md" />
                          <Skeleton className="h-6 w-20 shrink-0 rounded-md" />
                        </div>
                      </div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    // EmptyContent does not accept a description prop; embed message in title
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <div className={className} {...rest}>
        <EmptyContent title={`Something went wrong: ${msg}`} className="w-full" />
      </div>
    );
  }

  if (filteredData.length === 0) {
    if (searchQuery !== '') {
      return (
        <div className={className} {...rest}>
          <EmptyContent title="Try adjusting your search or filters" className="w-full" />
        </div>
      );
    }
    if (emptyConfig) {
      return (
        <div className={className} {...rest}>
          <EmptyContent
            title={emptyConfig.title}
            actions={
              emptyConfig.action
                ? [
                    {
                      // EmptyContentAction does not have buttonProps — omit it
                      type: 'button' as const,
                      label: emptyConfig.action.label,
                      onClick: emptyConfig.action.onClick,
                      variant: emptyConfig.action.variant ?? 'default',
                      icon: emptyConfig.action.icon,
                      iconPosition: emptyConfig.action.iconPosition,
                    },
                  ]
                : undefined
            }
            className="w-full"
          />
        </div>
      );
    }
    return (
      <div className={className} {...rest}>
        <EmptyContent title="No results." className="w-full" />
      </div>
    );
  }

  return (
    <div className={className} {...rest}>
      <Table>
        <TableBody>
          {filteredData.map((item) => {
            const id = getId(item);
            const perCardProps = resolveCardProps(cardProps, item);
            const conditionalClass = resolveCardClassName(cardClassName, item);
            return (
              // class strings from data-table-card-view.tsx
              <TableRow
                key={id}
                className="relative border-none transition-all duration-200 hover:bg-transparent">
                <TableCell className="p-0 pb-4">
                  <div className="bg-card hover:bg-card/70 rounded-lg transition-all duration-200">
                    <div
                      {...perCardProps}
                      onClick={(e) => {
                        perCardProps.onClick?.(e);
                        if (onSelect) onSelect(item);
                      }}
                      onKeyDown={(e) => {
                        perCardProps.onKeyDown?.(e);
                        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onSelect(item);
                        }
                      }}
                      role={onSelect ? 'button' : perCardProps.role}
                      tabIndex={onSelect ? 0 : perCardProps.tabIndex}
                      className={cn(
                        'group relative rounded-lg border p-6 shadow-none transition-all duration-200',
                        onSelect && 'cursor-pointer',
                        onSelect &&
                          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                        conditionalClass,
                        perCardProps.className
                      )}>
                      <div className="space-y-2">{renderCard(item)}</div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// CardList.Empty
// =============================================================================

export interface CardListEmptyProps {
  title: string;
  action?: CardListAction;
}

function CardListEmpty({ title, action }: CardListEmptyProps) {
  const { registerEmptyConfig } = useCardListContext();

  useEffect(() => {
    registerEmptyConfig({ title, action });
    return () => registerEmptyConfig(null);
  }, [title, action, registerEmptyConfig]);

  return null;
}

// =============================================================================
// Compound namespace export
// =============================================================================

export const CardList = Object.assign(CardListRoot, {
  Header: CardListHeader,
  Toolbar: CardListToolbar,
  Search: CardListSearch,
  Items: CardListItems,
  Empty: CardListEmpty,
});
