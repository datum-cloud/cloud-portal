import { DataTableRowActionsProps } from './data-table.types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { Button } from '@/components/ui/button'
import { EllipsisVerticalIcon } from 'lucide-react'
import { cn } from '@/utils/misc'

export const DataTableRowActions = <TData,>({
  row,
  actions,
}: {
  row: TData
  actions: DataTableRowActionsProps<TData>[]
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-accent">
          <EllipsisVerticalIcon className="size-5" />
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
              action.className,
            )}>
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
