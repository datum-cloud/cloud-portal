import { useCallback, useState } from 'react';

/**
 * Internal hook for managing inline content state
 * ⚠️ INTERNAL USE ONLY - Not exported to consumers
 *
 * This hook powers the DataTable's inline content functionality by managing:
 * - Content open/close state
 * - Create vs Edit mode
 * - Which row is being edited
 * - Current editing data
 */

export interface InlineContentState<TData> {
  isOpen: boolean;
  mode: 'create' | 'edit' | null;
  editingRowId: string | null;
  editingRowData: TData | null;
}

export interface UseInlineContentReturn<TData> {
  state: InlineContentState<TData>;
  open: (mode: 'create' | 'edit', rowData?: TData, rowId?: string) => void;
  close: () => void;
  isRowEditing: (rowId: string) => boolean;
}

export function useInlineContent<TData>(): UseInlineContentReturn<TData> {
  const [state, setState] = useState<InlineContentState<TData>>({
    isOpen: false,
    mode: null,
    editingRowId: null,
    editingRowData: null,
  });

  const open = useCallback((mode: 'create' | 'edit', rowData?: TData, rowId?: string) => {
    setState({
      isOpen: true,
      mode,
      editingRowId: rowId || null,
      editingRowData: rowData || null,
    });
  }, []);

  const close = useCallback(() => {
    setState({
      isOpen: false,
      mode: null,
      editingRowId: null,
      editingRowData: null,
    });
  }, []);

  const isRowEditing = useCallback(
    (rowId: string) => {
      return state.isOpen && state.mode === 'edit' && state.editingRowId === rowId;
    },
    [state.isOpen, state.mode, state.editingRowId]
  );

  return {
    state,
    open,
    close,
    isRowEditing,
  };
}
