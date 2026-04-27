import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

interface TablePanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * Visual shell for the table body + pagination. Provides the rounded border,
 * padding, and fade-in animation used by the old DataTablePanel. Internal —
 * consumers never render this directly.
 */
export function TablePanel({ children, className }: TablePanelProps) {
  return (
    <div className={cn('animate-data-table-fade-in overflow-hidden rounded-lg border', className)}>
      {children}
    </div>
  );
}
