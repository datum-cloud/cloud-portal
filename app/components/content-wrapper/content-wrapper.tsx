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
        'bg-background mx-auto flex h-full w-full flex-col gap-5 p-4 py-7 md:p-9',
        containerClassName
      )}>
      <Breadcrumb className="mx-auto w-full max-w-[1800px]" />
      <div className={cn('mx-auto flex w-full max-w-[1800px] flex-1 flex-col', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
