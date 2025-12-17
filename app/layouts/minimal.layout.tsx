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
    <div className="flex h-screen w-full flex-col">
      {/* Header at the top - outside sidebar context */}
      <Header />

      <ContentWrapper containerClassName="overflow-auto" contentClassName={className}>
        {/* <Breadcrumb /> - Future implementation */}
        {children}
      </ContentWrapper>
    </div>
  );
}
