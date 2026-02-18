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
              'border-table-accent dark:border-quaternary flex w-full flex-col gap-2 py-3 not-last:border-b sm:flex-row sm:items-center',
              itemClassName,
              item.className
            )}>
            <div
              className={cn(
                'flex min-w-0 items-center justify-start gap-1.5 text-left text-sm font-semibold sm:min-w-[200px]',
                labelClassName
              )}>
              {item.label}
            </div>
            <div className="flex justify-start text-left text-sm font-normal wrap-break-word sm:justify-end sm:text-right">
              {item.content}
            </div>
          </div>
        ))}
    </div>
  );
};
