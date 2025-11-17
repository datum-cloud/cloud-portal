/**
 * DataTable Column Type Definitions
 * Column header tooltip types and utilities
 *
 * Note: The module augmentation for TanStack Table's ColumnMeta
 * is in data-table-column-meta.d.ts
 */
import type { ReactNode } from 'react';

/**
 * Tooltip configuration for column headers
 */
export interface ColumnHeaderTooltip {
  /** Tooltip content - can be string or React node */
  content: string | ReactNode;
  /** Tooltip position relative to the header text */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Tooltip alignment */
  align?: 'start' | 'center' | 'end';
  /** Delay before showing tooltip (in milliseconds) */
  delayDuration?: number;
  /** Whether tooltip is disabled */
  disabled?: boolean;
}

/**
 * Type guard to check if tooltip is a rich configuration object
 */
export function isTooltipConfig(
  tooltip: string | ColumnHeaderTooltip
): tooltip is ColumnHeaderTooltip {
  return typeof tooltip === 'object' && tooltip !== null && 'content' in tooltip;
}

/**
 * Normalize tooltip to a configuration object
 */
export function normalizeTooltip(
  tooltip: string | ColumnHeaderTooltip | undefined
): ColumnHeaderTooltip | null {
  if (!tooltip) return null;

  if (typeof tooltip === 'string') {
    return {
      content: tooltip,
      side: 'top',
      align: 'center',
    };
  }

  return {
    side: 'top',
    align: 'center',
    ...tooltip,
  };
}
