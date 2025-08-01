import { MoreActionProps } from './more-action.types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { cn } from '@/utils/misc';
import { Ellipsis } from 'lucide-react';

export const MoreAction = <TData,>({
  row,
  actions,
  className,
}: {
  row?: TData;
  actions: MoreActionProps<TData>[];
  className?: string;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'data-[state=open]:bg-accent size-7 p-0 focus-visible:ring-0 focus-visible:ring-offset-0',
            className
          )}>
          <Ellipsis className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            onClick={() => action.action(row)}
            className={cn(
              'cursor-pointer',
              action.variant === 'destructive' && 'text-destructive',
              action.className
            )}
            disabled={action.isDisabled?.(row) ?? false}>
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
