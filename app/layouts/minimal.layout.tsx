import { Header } from '@datum-ui/components/header/header';
import { cn } from '@shadcn/lib/utils';
import React from 'react';

export function MinimalLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header at the top - outside sidebar context */}
      <Header />

      <div className="mx-auto flex h-full w-full flex-1 flex-col gap-6 px-6 py-5">
        {/* <Breadcrumb /> */}
        <div className={cn('flex max-w-full flex-1 flex-col gap-4', className)}>{children}</div>
      </div>
    </div>
  );
}
