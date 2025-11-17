import { cn } from '@shadcn/lib/utils';
import { TableCell, TableRow } from '@shadcn/ui/table';
import { ReactNode } from 'react';

/**
 * DataTableInlineForm - Wrapper component for inline form rendering
 *
 * This component provides a table row that spans all columns and contains
 * the form content. It handles the visual presentation while the form
 * component inside handles all logic (validation, submission, etc.)
 */

export interface InlineFormRenderParams<TData> {
  mode: 'create' | 'edit';
  data: TData | null;
  rowId: string | null;
  onClose: () => void;
}

export interface DataTableInlineFormProps<TData> {
  /**
   * Current mode: 'create' for new entries, 'edit' for existing rows
   */
  mode: 'create' | 'edit';

  /**
   * Current data being edited (null for create mode)
   */
  data: TData | null;

  /**
   * ID of the row being edited (null for create mode)
   */
  rowId: string | null;

  /**
   * Total number of columns (including actions column if present)
   * Used for colSpan to make the form row span entire table width
   */
  columnCount: number;

  /**
   * Callback to close the form (no submission handling - form handles that)
   */
  onClose: () => void;

  /**
   * Custom className for the table row
   */
  className?: string;

  /**
   * Render function that receives form params and returns form content
   */
  children: (params: InlineFormRenderParams<TData>) => ReactNode;
}

export function DataTableInlineForm<TData>({
  mode,
  data,
  rowId,
  columnCount,
  onClose,
  className,
  children,
}: DataTableInlineFormProps<TData>) {
  return (
    <TableRow
      className={cn(
        'bg-muted/50 border-l-4 border-l-primary hover:bg-muted/50',
        className
      )}>
      <TableCell colSpan={columnCount} className="p-0">
        {children({ mode, data, rowId, onClose })}
      </TableCell>
    </TableRow>
  );
}
