/**
 * Check if code is running in a browser environment.
 * Used for SSR safety in storage and other browser-dependent code.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function generateTaskId(): string {
  // Use crypto.randomUUID() if available for better uniqueness
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `task_${crypto.randomUUID()}`;
  }
  // Fallback for older environments
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
