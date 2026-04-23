import { cn } from '@shadcn/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

interface DataTablePanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function DataTablePanel({ children, className, ...rest }: DataTablePanelProps) {
  return (
    <div className={cn('rounded-lg border overflow-hidden', className)} {...rest}>
      {children}
    </div>
  );
}
