import type { ButtonProps } from '@datum-cloud/datum-ui/button';

/**
 * Legacy empty-state action `variant` understood by the Table / CardList
 * wrappers' public config API. Kept stable so route call-sites don't churn
 * when datum-ui's underlying `EmptyContent` action API changes.
 */
export type LegacyEmptyActionVariant = 'default' | 'destructive' | 'outline';

/** Icon placement in the wrapper's public config API (legacy naming). */
export type LegacyIconPosition = 'start' | 'end';

/**
 * Map the wrapper's legacy `variant` to datum-ui `Button` `type` + `theme`.
 *
 * Reproduces the exact rendering of datum-ui `EmptyContent` <=0.10.x, where
 * the action button was `type={variant === 'destructive' ? 'danger' : 'secondary'}`
 * and `theme={variant === 'outline' ? 'outline' : 'solid'}`. datum-ui 1.0.0
 * replaced the closed `variant` enum with the full Button surface, so the
 * wrapper now performs this translation itself.
 */
export function mapLegacyVariant(variant?: LegacyEmptyActionVariant): {
  type: NonNullable<ButtonProps['type']>;
  theme: NonNullable<ButtonProps['theme']>;
} {
  return {
    type: variant === 'destructive' ? 'danger' : 'secondary',
    theme: variant === 'outline' ? 'outline' : 'solid',
  };
}

/** Map legacy `'start' | 'end'` icon placement to datum-ui `'left' | 'right'`. */
export function mapLegacyIconPosition(position?: LegacyIconPosition): 'left' | 'right' | undefined {
  if (!position) return undefined;
  return position === 'end' ? 'right' : 'left';
}
