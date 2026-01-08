import * as React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

/**
 * Sonner Toaster configured for "headless" usage.
 *
 * We render our own toast markup via `toast.custom`, so we remove Sonner's default styling.
 */
export function Toaster({ toastOptions, ...props }: ToasterProps) {
  return <SonnerToaster toastOptions={{ unstyled: true, ...toastOptions }} {...props} />;
}
