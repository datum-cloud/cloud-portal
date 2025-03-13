import { cn } from '@/utils/misc'

export interface ListItem {
  label?: React.ReactNode | string
  content?: React.ReactNode | string
  className?: string
}

export const List = ({ items, className }: { items: ListItem[]; className?: string }) => {
  return (
    <div className={cn('flex flex-col', className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'flex w-full items-center gap-2 px-4 py-2 [&:not(:last-child)]:border-b',
            item.className,
          )}>
          <div className="flex min-w-[100px] justify-start text-left text-sm font-medium">
            {item.label}
          </div>
          <div className="text-primary flex justify-end text-right text-sm font-normal break-words">
            {item.content}
          </div>
        </div>
      ))}
    </div>
  )
}
