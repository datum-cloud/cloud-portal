import { ListProps } from './list.types';
import { cn } from '@/utils/misc';

export const List = ({ items, className, itemClassName, labelClassName }: ListProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      {items
        .filter((item) => !item.hidden)
        .map((item, index) => (
          <div
            key={index}
            className={cn(
              'text-primary flex w-full items-center gap-2 px-4 py-2 [&:not(:last-child)]:border-b',
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
