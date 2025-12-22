import { ContentWrapperProps } from './content-wrapper.types';
import { Breadcrumb } from '@/components/header';
import { cn } from '@shadcn/lib/utils';

export function ContentWrapper({
  children,
  containerClassName,
  contentClassName,
}: ContentWrapperProps) {
  return (
    <div
      className={cn(
        'mx-auto flex h-full w-full max-w-[1600px] flex-col gap-5 p-9',
        containerClassName
      )}>
      <Breadcrumb className="w-full" />
      <div className={cn('flex w-full flex-1 flex-col', contentClassName)}>{children}</div>
    </div>
  );
}
