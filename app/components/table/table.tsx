import { TableClient } from './client';
import { TableServer } from './server';

/**
 * Compound namespace for cloud-portal's data table. Provides a two-member
 * surface covering the client-paged and server-paged cases:
 *
 * - `Table.Client<TData>` — consumer supplies the full dataset as `data`
 *   and the table handles sorting, filtering, search, and pagination in
 *   memory.
 * - `Table.Server<TData, TResponse>` — consumer supplies `fetchFn` +
 *   `transform` and the table coordinates server-side pagination/sorting.
 *
 * Both members share the toolbar/panel/empty-state shell and accept the
 * same row-level props (columns, getRowId, rowActions, multiActions,
 * onRowClick). See `./types.ts` for the full prop contracts.
 */
export const Table = {
  Client: TableClient,
  Server: TableServer,
};
