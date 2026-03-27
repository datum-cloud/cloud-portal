import { useDataTable } from '../../core/data-table.context';
import {
  DataTableSearchConfig,
  DataTableTitleProps,
  DataTableToolbarConfig,
  MultiAction,
} from '../../core/data-table.types';
import { DataTableFilter } from '../filter/data-table-filter';
import { DataTableToolbarFilterDropdown } from './data-table-toolbar-filter-dropdown';
import { DataTableToolbarMultiActions } from './data-table-toolbar-multi-actions';
import { DataTableToolbarRowCount } from './data-table-toolbar-row-count';
import { DataTableToolbarSearch } from './data-table-toolbar-search';
import { PageTitle } from '@datum-ui/components/page-title';
import { cn } from '@shadcn/lib/utils';
import { Children, isValidElement, ReactElement, ReactNode, useMemo } from 'react';

interface FilterProps {
  filterKey?: string;
  children?: ReactNode;
}

/**
 * Recursively extracts filter children from a React node tree.
 * Handles fragments, arrays, and wrapper divs to find actual filter components.
 */
function flattenFilterChildren(children: ReactNode): ReactElement<FilterProps>[] {
  const result: ReactElement<FilterProps>[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    const props = child.props as FilterProps;

    // Check if this is a filter component (has filterKey prop)
    if (props.filterKey) {
      result.push(child as ReactElement<FilterProps>);
      return;
    }

    // If it's a fragment or has children, recurse into it
    if (props.children) {
      result.push(...flattenFilterChildren(props.children));
    }
  });

  return result;
}

export interface DataTableToolbarProps {
  /**
   * Table title, description, and actions configuration
   * @deprecated Use title, description, and actions props directly
   */
  tableTitle?: DataTableTitleProps;

  /**
   * Filter component (DataTableFilter or custom filter component)
   * @deprecated Use `filters` prop instead - this will auto-wrap filters
   */
  filterComponent?: React.ReactNode;

  /**
   * New unified filters prop - filters are auto-wrapped in DataTableFilter context
   * No manual wrapping needed
   */
  filters?: React.ReactNode;

  /**
   * Whether to show the toolbar section
   * @default true if either tableTitle, filterComponent, or filters is provided
   */
  show?: boolean;

  /**
   * Toolbar configuration for new compact layout
   */
  config?: DataTableToolbarConfig;

  /**
   * Title for the table (new API)
   */
  title?: string;

  /**
   * Description for the table (new API)
   */
  description?: string;

  /**
   * Actions for the table (new API)
   */
  actions?: ReactNode;

  /**
   * Custom className for the toolbar
   */
  className?: string;

  /**
   * Custom className for left section
   */
  leftSectionClassName?: string;

  /**
   * Custom className for right section
   */
  rightSectionClassName?: string;

  /**
   * Multi-select bulk actions
   * Shown in the left section when rows are selected
   */
  multiActions?: MultiAction<any>[];
}

/**
 * DataTableToolbar
 *
 * Renders the toolbar section of the DataTable with two layout modes:
 *
 * **Stacked Layout (default/legacy)**:
 * - Page title and description at top
 * - Filters displayed inline below
 * - Traditional vertical layout
 *
 * **Compact Layout (new)**:
 * - Horizontal toolbar with left/right sections
 * - Left: Built-in search + primary filters
 * - Right: Filter dropdown + actions
 * - Space-efficient for modern UIs
 */
export const DataTableToolbar = ({
  tableTitle,
  filterComponent,
  filters,
  show = true,
  config,
  title,
  description,
  actions,
  className,
  leftSectionClassName,
  rightSectionClassName,
  multiActions,
}: DataTableToolbarProps) => {
  const { table, globalFilter, getFilterValue } = useDataTable();

  // Merge title/description/actions from both old and new API
  const finalTitle = title || tableTitle?.title;
  const finalDescription = description || tableTitle?.description;
  const finalActions = actions || tableTitle?.actions;
  const finalRightSide = tableTitle?.rightSide;

  // Determine which filter source to use (new filters prop takes precedence)
  // Auto-wrap filters if using new API
  const finalFilterComponent = useMemo(() => {
    if (filters) {
      // New API: auto-wrap filters in DataTableFilter context
      return <DataTableFilter>{filters}</DataTableFilter>;
    }
    // Legacy API: use filterComponent as-is (already wrapped)
    return filterComponent;
  }, [filters, filterComponent]);

  // Default config
  const toolbarConfig: DataTableToolbarConfig = useMemo(
    () => ({
      layout: config?.layout || 'stacked',
      // Support both old 'search' and new 'includeSearch' (new takes precedence)
      search: config?.includeSearch ?? config?.search,
      includeSearch: config?.includeSearch ?? config?.search,
      filtersDisplay: config?.filtersDisplay || 'inline',
      maxInlineFilters: config?.maxInlineFilters || 3,
      primaryFilters: config?.primaryFilters,
      showFilterCount: config?.showFilterCount ?? true,
      showRowCount: config?.showRowCount ?? false, // Default to false, must be explicitly enabled
      alwaysShowSearchAndFilters: config?.alwaysShowSearchAndFilters ?? false,
      responsive: config?.responsive ?? true,
    }),
    [config]
  );

  // For non-activity tables: only show search/filters row when there's data or a search query
  const hasData = table.getRowModel().rows.length > 0;
  const searchQuery = globalFilter?.trim() || '';
  const filterSearchQuery = getFilterValue<string>('q')?.trim() || '';
  const hasSearchQuery = searchQuery.length > 0 || filterSearchQuery.length > 0;
  const showCompactRowByDefault = hasData || hasSearchQuery;
  const showCompactRow = toolbarConfig.alwaysShowSearchAndFilters || showCompactRowByDefault;

  // Parse search config
  const searchConfig: DataTableSearchConfig | null = useMemo(() => {
    if (!toolbarConfig.includeSearch) return null;

    if (typeof toolbarConfig.includeSearch === 'boolean') {
      return {
        placeholder: 'Search...',
        filterKey: 'q',
        mode: 'global-search', // Default to global-search
        debounce: 300,
      };
    }

    return {
      placeholder: toolbarConfig.includeSearch.placeholder || 'Search...',
      filterKey: toolbarConfig.includeSearch.filterKey || 'q',
      mode: toolbarConfig.includeSearch.mode || 'global-search', // Default to global-search
      searchableColumns: toolbarConfig.includeSearch.searchableColumns,
      debounce: toolbarConfig.includeSearch.debounce || 300,
    };
  }, [toolbarConfig.includeSearch]);

  // Split filters into inline and dropdown based on config
  const { inlineFilters, dropdownFilters } = useMemo(() => {
    if (!finalFilterComponent) {
      return { inlineFilters: null, dropdownFilters: null };
    }

    // Flatten filter children to handle wrapped/nested filters
    // This extracts actual filter components (those with filterKey prop)
    const flatFilters = flattenFilterChildren(finalFilterComponent);

    // Fallback to Children.toArray if no filter components found
    // (for backwards compatibility with non-standard filter structures)
    const filterArray =
      flatFilters.length > 0 ? flatFilters : Children.toArray(finalFilterComponent);

    // If stacked layout or inline display, show all filters inline
    if (toolbarConfig.layout === 'stacked' || toolbarConfig.filtersDisplay === 'inline') {
      return { inlineFilters: filterArray, dropdownFilters: null };
    }

    // If dropdown display, all in dropdown
    if (toolbarConfig.filtersDisplay === 'dropdown') {
      return { inlineFilters: null, dropdownFilters: filterArray };
    }

    // Auto mode: smart split based on primaryFilters and maxInlineFilters
    const primaryFilterKeys = toolbarConfig.primaryFilters || [];
    const maxInline = toolbarConfig.maxInlineFilters || 3;

    // If primaryFilters is specified, use it to determine inline vs dropdown
    if (primaryFilterKeys.length > 0) {
      const inline: ReactNode[] = [];
      const dropdown: ReactNode[] = [];

      filterArray.forEach((filter) => {
        const filterKey = isValidElement<FilterProps>(filter) ? filter.props?.filterKey : undefined;
        if (filterKey && primaryFilterKeys.includes(filterKey)) {
          inline.push(filter);
        } else {
          dropdown.push(filter);
        }
      });

      return {
        inlineFilters: inline.length > 0 ? inline : null,
        dropdownFilters: dropdown.length > 0 ? dropdown : null,
      };
    }

    // No primaryFilters specified - use maxInlineFilters count
    if (filterArray.length <= maxInline) {
      return { inlineFilters: filterArray, dropdownFilters: null };
    }

    // Split: first N inline, rest in dropdown
    return {
      inlineFilters: filterArray.slice(0, maxInline),
      dropdownFilters: filterArray.slice(maxInline),
    };
  }, [finalFilterComponent, toolbarConfig]);

  // Don't render if explicitly hidden or if no content to show
  if (
    !show ||
    (!finalTitle &&
      !finalDescription &&
      !finalActions &&
      !finalRightSide &&
      !finalFilterComponent &&
      !toolbarConfig.includeSearch)
  ) {
    return null;
  }

  // Render stacked layout (legacy/default)
  if (toolbarConfig.layout === 'stacked') {
    return (
      <div className={cn('space-y-5', className)}>
        {/* Page Title Section */}
        {(finalTitle || finalDescription || finalActions || finalRightSide) && (
          <div className="flex w-full items-start justify-between gap-4">
            <PageTitle title={finalTitle} description={finalDescription} actions={finalActions} />
            {finalRightSide && <div className="shrink-0">{finalRightSide}</div>}
          </div>
        )}

        {/* Filter Section */}
        {finalFilterComponent && <div>{finalFilterComponent}</div>}
      </div>
    );
  }

  // Shared renderer for the right section (inline filters + dropdown + actions)
  const renderRightSection = () => (
    <div
      className={cn(
        'flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3',
        rightSectionClassName
      )}>
      {toolbarConfig.showRowCount && <DataTableToolbarRowCount />}
      {multiActions && multiActions.length > 0 && (
        <DataTableToolbarMultiActions actions={multiActions} />
      )}
      {inlineFilters && inlineFilters.length > 0 && (
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
          {inlineFilters.map((filter, index) => (
            <div key={`inline-filter-${index}`} className="min-w-0 flex-1 sm:flex-initial">
              {filter}
            </div>
          ))}
        </div>
      )}
      {dropdownFilters && dropdownFilters.length > 0 && (
        <DataTableToolbarFilterDropdown
          showFilterCount={toolbarConfig.showFilterCount}
          excludeColumns={['q', 'search']}>
          {dropdownFilters.map((filter, index) => (
            <div key={`filter-${index}`} className="border-b pb-5 last:border-b-0 last:pb-0">
              {filter}
            </div>
          ))}
        </DataTableToolbarFilterDropdown>
      )}
      {finalActions && (
        <div
          className={cn(
            'flex items-center gap-2',
            !inlineFilters?.length && !dropdownFilters?.length && 'w-full sm:w-auto'
          )}>
          {finalActions}
        </div>
      )}
    </div>
  );

  // Render compact layout (new): single top row = title + search/filters on left, rightSide on right
  const hasTitleRow = finalTitle || finalDescription || finalRightSide;
  const hasToolbarRow =
    (searchConfig || inlineFilters?.length || dropdownFilters?.length || finalActions) &&
    showCompactRow;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Single top row: left = title + search/filters, right = rightSide card */}
      {hasTitleRow && (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <PageTitle title={finalTitle} description={finalDescription} />
            {/* Search + filters inline with title area (pushed to top) */}
            {hasToolbarRow && (
              <DataTableFilter className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div
                  className={cn(
                    'flex w-full min-w-0 flex-1 items-center gap-3 sm:w-auto',
                    leftSectionClassName
                  )}>
                  {searchConfig && (
                    <DataTableToolbarSearch config={searchConfig} className="rounded-md" />
                  )}
                </div>
                {renderRightSection()}
              </DataTableFilter>
            )}
          </div>
          {finalRightSide && <div className="shrink-0">{finalRightSide}</div>}
        </div>
      )}

      {/* Fallback: toolbar row only when no title */}
      {!hasTitleRow && hasToolbarRow && (
        <DataTableFilter className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          {/* Left Section: Search */}
          <div className={cn('flex w-full items-center gap-3 sm:w-auto', leftSectionClassName)}>
            {searchConfig && (
              <DataTableToolbarSearch config={searchConfig} className="rounded-md" />
            )}
          </div>

          {/* Right Section */}
          {renderRightSection()}
        </DataTableFilter>
      )}
    </div>
  );
};
