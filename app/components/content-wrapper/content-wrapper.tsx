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
        'mx-auto flex h-full w-full max-w-[1600px] flex-col gap-5 px-9 py-8',
        containerClassName
      )}>
      <Breadcrumb />
      <div className={cn('flex max-w-full flex-1 flex-col', contentClassName)}>{children}</div>
    </div>
  );
}
