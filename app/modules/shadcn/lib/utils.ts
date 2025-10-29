/**
 * shadcn/ui Utilities
 * Combines multiple class names using clsx and tailwind-merge
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names using clsx and tailwind-merge
 * Useful for conditionally applying Tailwind CSS classes
 * @param inputs - Array of class values to be merged
 * @returns Merged class string with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
