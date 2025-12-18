import { ContentWrapperProps } from './content-wrapper.types';
import { Breadcrumb } from '@/components/header';
import { cn } from '@shadcn/lib/utils';

export function ContentWrapper({
  children,
  containerClassName,
  contentClassName,
}: ContentWrapperProps) {
  return (
    <div className={cn('flex h-full w-full flex-col px-9 py-8', containerClassName)}>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <Breadcrumb />
        <div className={cn('flex max-w-full flex-1 flex-col', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
