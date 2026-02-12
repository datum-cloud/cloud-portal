import { Button } from '@datum-ui/components';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@datum-ui/components';
import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
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
  tooltip?: string | ((row?: TData) => string); // Tooltip text - can be static string or function that receives row data
}

export const MoreActions = <TData,>({
  row,
  actions,
  className,
  disabled = false,
  iconClassName,
}: {
  row?: TData;
  actions: MoreActionsProps<TData>[];
  className?: string;
  disabled?: boolean;
  iconClassName?: string;
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
          type="quaternary"
          theme="borderless"
          size="icon"
          disabled={disabled}
          className={cn(
            'data-[state=open]:bg-accent size-7 p-0 focus-visible:ring-0 focus-visible:ring-offset-0',
            className
          )}>
          <Ellipsis className={cn('size-5', iconClassName)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleActions.map((action) => {
          // Generate tooltip text from action config or fallback to label
          const tooltipText =
            typeof action.tooltip === 'function'
              ? action.tooltip(row)
              : (action.tooltip ?? action.label);

          const menuItem = (
            <DropdownMenuItem
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                action.action(row);
              }}
              className={cn(
                'cursor-pointer text-xs',
                action.variant === 'destructive' &&
                  'text-destructive [&_svg]:!text-destructive hover:!text-destructive hover:[&_svg]:!text-destructive',
                action.className
              )}
              disabled={action.disabled?.(row) ?? false}>
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          );

          // Wrap with tooltip if tooltip text differs from label (shows additional context)
          if (tooltipText && tooltipText !== action.label) {
            return (
              <Tooltip key={action.key} message={tooltipText}>
                {menuItem}
              </Tooltip>
            );
          }

          return <div key={action.key}>{menuItem}</div>;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
