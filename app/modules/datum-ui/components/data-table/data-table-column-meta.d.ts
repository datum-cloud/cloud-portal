/**
 * TanStack Table Column Meta Augmentation
 * Extends ColumnMeta with tooltip support for DataTable headers
 */
import type { ColumnHeaderTooltip } from './data-table-column.types';
import type { RowData } from '@tanstack/table-core';

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Custom className for the column header/cell */
    className?: string;

    /**
     * Tooltip for the column header
     * Can be a simple string or a rich configuration object
     *
     * @example
     * Simple string tooltip:
     * ```tsx
     * meta: {
     *   tooltip: 'This is a description of the column'
     * }
     * ```
     *
     * Rich configuration:
     * ```tsx
     * meta: {
     *   tooltip: {
     *     content: 'Detailed description',
     *     side: 'top',
     *     align: 'start',
     *     delayDuration: 200
     *   }
     * }
     * ```
     */
    tooltip?: string | ColumnHeaderTooltip;
  }
}
