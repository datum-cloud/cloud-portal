/**
 * shadcn UI Kit Module
 *
 * A self-contained, modular UI kit built on shadcn/ui and Tailwind CSS v4
 *
 * @example Basic usage
 * ```typescript
 * import { Button, Card, Input, useToast, cn } from '@/modules/shadcn';
 * ```
 *
 * @example Granular imports
 * ```typescript
 * import { Button } from '@/modules/datum-ui/components/button.tsx';
 * import { useToast } from '@/modules/shadcn/ui/hooks/use-toast';
 * ```
 *
 * @example Styles
 * ```typescript
 * // In your app root
 * import '@/modules/shadcn/styles/shadcn.css';
 * import '@/modules/shadcn/styles/animations.css';
 * ```
 */

// Re-export all UI components, hooks, and utilities
export * from './ui';

// Re-export styles reference
export * from './styles';
