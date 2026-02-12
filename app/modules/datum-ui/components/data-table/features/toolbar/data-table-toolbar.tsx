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
import { PageTitle } from '@/components/page-title/page-title';
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

/**
 * Gets the filterKey from a filter component element
 */
function getFilterKey(element: ReactElement<FilterProps>): string | undefined {
  return element.props?.filterKey;
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
 *
 * @example
 * // Legacy API (still supported)
 * <DataTableToolbar
 *   tableTitle={{ title: "Users", actions: <Button /> }}
 *   filterComponent={<DataTableFilter>...</DataTableFilter>}
 * />
 *
 * @example
 * // New Compact API
 * <DataTableToolbar
 *   title="Users"
 *   description="Manage users"
 *   actions={<Button>Add User</Button>}
 *   config={{
 *     layout: 'compact',
 *     search: { placeholder: 'Search users...' },
 *     filtersDisplay: 'dropdown'
 *   }}
 *   filterComponent={<DataTableFilter>...</DataTableFilter>}
 * />
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
  // Merge title/description/actions from both old and new API
  const finalTitle = title || tableTitle?.title;
  const finalDescription = description || tableTitle?.description;
  const finalActions = actions || tableTitle?.actions;

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
      responsive: config?.responsive ?? true,
    }),
    [config]
  );

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
  if (!show || (!finalTitle && !finalFilterComponent && !toolbarConfig.includeSearch)) {
    return null;
  }

  // Render stacked layout (legacy/default)
  if (toolbarConfig.layout === 'stacked') {
    return (
      <div className={cn('space-y-5', className)}>
        {/* Page Title Section */}
        {(finalTitle || finalDescription || finalActions) && (
          <PageTitle title={finalTitle} description={finalDescription} actions={finalActions} />
        )}

        {/* Filter Section */}
        {finalFilterComponent && <div>{finalFilterComponent}</div>}
      </div>
    );
  }

  // Render compact layout (new)
  return (
    <div className={cn('space-y-5', className)}>
      {/* Title and Description at Top (if provided) */}
      {(finalTitle || finalDescription) && (
        <PageTitle title={finalTitle} description={finalDescription} />
      )}

      {/* Compact Toolbar Row */}

      <DataTableFilter className="flex items-center justify-between gap-4">
        {/* Left Section: Search */}
        <div className={cn('flex flex-1 items-center gap-3', leftSectionClassName)}>
          {searchConfig && (
            <DataTableToolbarSearch config={searchConfig} className="w-full rounded-md" />
          )}
        </div>

        {/* Right Section: Row Count + Multi-actions + Inline/Primary Filters + Dropdown Filters + Actions */}
        <div className={cn('flex items-center justify-end gap-3', rightSectionClassName)}>
          {/* Row count (shows "X of Y selected" when rows are selected) */}
          {toolbarConfig.showRowCount && <DataTableToolbarRowCount />}

          {/* Multi-actions (shown when rows are selected) */}
          {multiActions && multiActions.length > 0 && (
            <DataTableToolbarMultiActions actions={multiActions} />
          )}

          {/* Primary/Inline filters next to dropdown */}
          {inlineFilters && inlineFilters.length > 0 && (
            <div className="flex items-center gap-2">
              {inlineFilters.map((filter, index) => (
                <div key={`inline-filter-${index}`}>{filter}</div>
              ))}
            </div>
          )}

          {/* Dropdown filters button */}
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

          {finalActions && <div className="flex items-center gap-2">{finalActions}</div>}
        </div>
      </DataTableFilter>
    </div>
  );
};
