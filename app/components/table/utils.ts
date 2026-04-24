import type { TableSharedProps } from './types';

/**
 * Returns true if any toolbar-rendering prop is set. The wrapper uses this
 * to decide whether to render the TableToolbar subcomponent at all.
 */
export function detectToolbar<TData>(props: TableSharedProps<TData>): boolean {
  return !!(
    props.title ||
    props.description ||
    props.search ||
    (props.filters && props.filters.length > 0) ||
    props.actions ||
    props.headerExtra
  );
}

/**
 * Projects a full TableClient/TableServer props bag down to just the fields
 * the TableToolbar subcomponent needs. Keeps TableToolbar's prop surface small.
 */
export function toolbarPropsFrom<TData>(props: TableSharedProps<TData>) {
  return {
    title: props.title,
    description: props.description,
    search: props.search,
    filters: props.filters,
    actions: props.actions,
    multiActions: props.multiActions,
    headerExtra: props.headerExtra,
  };
}
