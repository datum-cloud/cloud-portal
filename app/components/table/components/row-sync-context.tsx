import { isRowLocked, type RowSyncState } from '@/modules/watch/sync-state';
import { createContext, useContext } from 'react';

type GetRowSyncKey = (row: unknown) => string | undefined;

const RowSyncKeyContext = createContext<GetRowSyncKey | undefined>(undefined);

export const RowSyncKeyProvider = RowSyncKeyContext.Provider;

export function useRowSyncKey(row: unknown): string | undefined {
  return useContext(RowSyncKeyContext)?.(row);
}

/** True for a row the table must not open or act on (locked, or fading out after delete). */
export const isTableRowLocked = (key: string | undefined, state: RowSyncState | undefined) =>
  state === 'removing' || isRowLocked(key, state);
