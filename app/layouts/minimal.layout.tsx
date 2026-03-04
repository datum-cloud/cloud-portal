import { ContentWrapper } from '@/components/content-wrapper';
import { Header } from '@/components/header/header';
import React from 'react';

export function MinimalLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="mx-auto flex h-full w-full flex-col">
      <Header />

      <ContentWrapper
        containerClassName="flex-1 min-h-0 overflow-auto"
        contentClassName={className}>
        {/* <Breadcrumb /> - Future implementation */}
        {children}
      </ContentWrapper>
    </div>
  );
}
