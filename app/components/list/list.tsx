import { cn } from '@shadcn/lib/utils';

export interface ListItem {
  label?: React.ReactNode | string;
  content?: React.ReactNode | string;
  className?: string;
  hidden?: boolean;
}

interface ListProps {
  /**
   * Array of list items to display
   */
  items: ListItem[];
  /**
   * Optional className for the list container
   */
  className?: string;
  /**
   * Optional className applied to all list items
   */
  itemClassName?: string;

  labelClassName?: string;
}

export const List = ({ items, className, itemClassName, labelClassName }: ListProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      {items
        .filter((item) => !item.hidden)
        .map((item, index) => (
          <div
            key={index}
            className={cn(
              'border-table-accent flex w-full items-center gap-2 py-3.5 [&:not(:last-child)]:border-b',
              itemClassName,
              item.className
            )}>
            <div
              className={cn(
                'flex min-w-[200px] justify-start text-left text-sm font-semibold',
                labelClassName
              )}>
              {item.label}
            </div>
            <div className="flex justify-end text-right text-sm font-normal break-words">
              {item.content}
            </div>
          </div>
        ))}
    </div>
  );
};
