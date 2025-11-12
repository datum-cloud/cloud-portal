import { ContentWrapperProps } from './content-wrapper.types';
import { useSidebar } from '@datum-ui/components/sidebar';
import { cn } from '@shadcn/lib/utils';
import { useState, useLayoutEffect } from 'react';

export function ContentWrapper({
  children,
  containerClassName,
  contentClassName,
}: ContentWrapperProps) {
  const { hasSubLayout } = useSidebar();
  const [isReady, setIsReady] = useState(false);

  // Mark as ready after first layout to prevent flash
  useLayoutEffect(() => {
    setIsReady(true);
  }, []);

  // Always render a container, but conditionally apply padding based on hasSubLayout
  // Hide content until layout is determined to prevent flash
  return (
    <div
      className={cn(
        'mx-auto flex h-full w-full flex-1 flex-col transition-opacity duration-75',
        !hasSubLayout && 'gap-6 overflow-auto p-9',
        !isReady && 'opacity-0',
        isReady && 'opacity-100',
        containerClassName
      )}>
      {!hasSubLayout && <>{/* <Breadcrumb /> - Future implementation */}</>}
      <div
        className={cn(
          'flex max-w-full flex-1 flex-col',
          !hasSubLayout && 'gap-4',
          contentClassName
        )}>
        {children}
      </div>
    </div>
  );
}
