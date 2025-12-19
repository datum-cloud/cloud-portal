import { ContentWrapperProps } from './content-wrapper.types';
import { Breadcrumb } from '@/components/header';
import { cn } from '@shadcn/lib/utils';

export function ContentWrapper({
  children,
  containerClassName,
  contentClassName,
}: ContentWrapperProps) {
  return (
    <div className={cn('flex h-full w-full flex-col gap-5 px-9 py-8', containerClassName)}>
      <Breadcrumb className="mx-auto w-full max-w-[1600px]" />
      <div className={cn('mx-auto flex w-full max-w-[1600px] flex-1 flex-col', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
