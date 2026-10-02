import React from 'react';

/**
 * Chrome-free frame for plugin pages that declare `layout: "bare"`: no sidebar,
 * header or dock, just the page filling the window.
 */
export function BareLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      data-testid="bare-layout"
      className="bg-background flex h-dvh min-h-0 flex-col overflow-hidden">
      {children}
    </main>
  );
}
