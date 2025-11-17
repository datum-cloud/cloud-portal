import { cn } from '@shadcn/lib/utils';
import { TableCell, TableRow } from '@shadcn/ui/table';
import { ReactNode, useEffect, useState } from 'react';

/**
 * DataTableInlineContent - Wrapper component for inline content rendering
 *
 * This component provides a table row that spans all columns and contains
 * custom content (form, preview, details, etc.). It handles the visual
 * presentation and animations while the content component handles all logic.
 *
 * Position is automatically determined based on mode:
 * - Create mode: Renders at top (first row) of table
 * - Edit mode: Replaces the editing row
 */

export interface InlineContentRenderParams<TData> {
  mode: 'create' | 'edit';
  data: TData | null;
  onClose: () => void;
}

export interface DataTableInlineContentProps<TData> {
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
   * Used for colSpan to make the content row span entire table width
   */
  columnCount: number;

  /**
   * Callback to close the inline content
   */
  onClose: () => void;

  /**
   * Custom className for the table row
   */
  className?: string;

  /**
   * Render function that receives content params and returns content
   */
  children: (params: InlineContentRenderParams<TData>) => ReactNode;
}

export function DataTableInlineContent<TData>({
  mode,
  data,
  rowId,
  columnCount,
  onClose,
  className,
  children,
}: DataTableInlineContentProps<TData>) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Entry animation
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  // Handle close with exit animation
  const handleClose = () => {
    setIsExiting(true);
    setIsVisible(false);

    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  };

  return (
    <TableRow
      data-inline-content
      data-mode={mode}
      className={cn(
        'border-l-primary bg-muted/50 hover:bg-muted/50 border-l-4',
        // Animation classes
        'transition-all duration-200 ease-in-out',
        'transform-gpu', // Use GPU acceleration
        // Entry/Exit states
        isVisible && !isExiting ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
        className
      )}>
      <TableCell colSpan={columnCount} className="p-0">
        {children({ mode, data, onClose: handleClose })}
      </TableCell>
    </TableRow>
  );
}
