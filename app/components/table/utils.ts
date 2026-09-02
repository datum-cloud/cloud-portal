import type { LiveUpdatesConfig, RowData, TableSharedProps } from './types';

/**
 * Returns true if any toolbar-rendering prop is set. The wrapper uses this
 * to decide whether to render the TableToolbar subcomponent at all.
 *
 * `liveUpdates` counts too: it renders the pause/resume toggle (plus its
 * catch-up chip) into the toolbar's left group. A table passing only
 * `liveUpdates` (no title, search, filters, actions, or headerExtra) still
 * needs the toolbar to mount, or the chip would have nowhere to render —
 * it only ever appears beside the toggle.
 *
 * It is accepted as an extra field rather than read off `TableSharedProps`
 * because only `TableClientProps` carries it — Table.Server renders no
 * toggle and no chip.
 */
export function detectToolbar<TData extends RowData>(
  props: TableSharedProps<TData> & { liveUpdates?: LiveUpdatesConfig }
): boolean {
  return !!(
    props.title ||
    props.description ||
    props.search ||
    (props.filters && props.filters.length > 0) ||
    props.actions ||
    props.headerExtra ||
    props.liveUpdates
  );
}

/**
 * Projects a full TableClient/TableServer props bag down to just the fields
 * the TableToolbar subcomponent needs. Keeps TableToolbar's prop surface small.
 */
export function toolbarPropsFrom<TData extends RowData>(props: TableSharedProps<TData>) {
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
