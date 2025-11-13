import { ContentWrapperProps } from './content-wrapper.types';
import { cn } from '@shadcn/lib/utils';

export function ContentWrapper({
  children,
  containerClassName,
  contentClassName,
}: ContentWrapperProps) {
  return (
    <div className={cn('mx-auto flex h-full w-full flex-1 flex-col', containerClassName)}>
      <div className={cn('flex max-w-full flex-1 flex-col', contentClassName)}>{children}</div>
    </div>
  );
}
