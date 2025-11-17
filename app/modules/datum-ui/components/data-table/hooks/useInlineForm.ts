import { useCallback, useState } from 'react';

/**
 * Internal hook for managing inline form state
 * ⚠️ INTERNAL USE ONLY - Not exported to consumers
 *
 * This hook powers the DataTable's inline form functionality by managing:
 * - Form open/close state
 * - Create vs Edit mode
 * - Which row is being edited
 * - Current editing data
 */

export interface InlineFormState<TData> {
  isOpen: boolean;
  mode: 'create' | 'edit' | null;
  editingRowId: string | null;
  editingRowData: TData | null;
}

export interface UseInlineFormReturn<TData> {
  state: InlineFormState<TData>;
  openForm: (mode: 'create' | 'edit', rowData?: TData, rowId?: string) => void;
  closeForm: () => void;
  isRowEditing: (rowId: string) => boolean;
}

export function useInlineForm<TData>(): UseInlineFormReturn<TData> {
  const [state, setState] = useState<InlineFormState<TData>>({
    isOpen: false,
    mode: null,
    editingRowId: null,
    editingRowData: null,
  });

  const openForm = useCallback(
    (mode: 'create' | 'edit', rowData?: TData, rowId?: string) => {
      setState({
        isOpen: true,
        mode,
        editingRowId: rowId || null,
        editingRowData: rowData || null,
      });
    },
    []
  );

  const closeForm = useCallback(() => {
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
    openForm,
    closeForm,
    isRowEditing,
  };
}
