/**
 * Check if code is running in a browser environment.
 * Used for SSR safety in storage and other browser-dependent code.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}
