import { cn } from '@shadcn/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

interface DataTablePanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function DataTablePanel({ children, className, ...rest }: DataTablePanelProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg border', className)} {...rest}>
      {children}
    </div>
  );
}
