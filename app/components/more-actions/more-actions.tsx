import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { cn } from '@/utils/common';
import { Ellipsis } from 'lucide-react';
import { useState } from 'react';

export interface MoreActionsProps<TData> {
  key: string;
  label: string;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
  className?: string;
  action: (row?: TData) => void | Promise<void>;
  disabled?: (row?: TData) => boolean;
  hidden?: (row?: TData) => boolean;
}

export const MoreActions = <TData,>({
  row,
  actions,
  className,
  disabled = false,
}: {
  row?: TData;
  actions: MoreActionsProps<TData>[];
  className?: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState<boolean>(false);
  // Filter visible actions
  const visibleActions = actions.filter((action) => !action.hidden?.(row));

  // Hide if no visible actions remain
  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          onClick={() => setOpen(!open)}
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            'data-[state=open]:bg-accent size-7 p-0 focus-visible:ring-0 focus-visible:ring-offset-0',
            className
          )}>
          <Ellipsis className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleActions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              action.action(row);
            }}
            className={cn(
              'cursor-pointer',
              action.variant === 'destructive' &&
                'text-destructive [&_svg]:!text-destructive hover:!text-destructive hover:[&_svg]:!text-destructive',
              action.className
            )}
            disabled={action.disabled?.(row) ?? false}>
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
