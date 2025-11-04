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
              'flex w-full items-center gap-2 px-4 py-2 [&:not(:last-child)]:border-b',
              itemClassName,
              item.className
            )}>
            <div
              className={cn(
                'flex min-w-[100px] justify-start text-left text-sm font-medium',
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
