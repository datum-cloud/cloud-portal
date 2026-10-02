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
    // Fixed viewport height (as in DashboardLayout): the body is `h-auto`, so `h-full`
    // would collapse to the content and leave the card background short of the fold.
    <div className="mx-auto flex h-svh w-full flex-col overflow-hidden">
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
