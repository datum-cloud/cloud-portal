import { AmexMark } from '@/features/billing/components/card-brand-icons/amex';
import { DinersMark } from '@/features/billing/components/card-brand-icons/diners';
import { DiscoverMark } from '@/features/billing/components/card-brand-icons/discover';
import { GenericMark } from '@/features/billing/components/card-brand-icons/generic';
import { JcbMark } from '@/features/billing/components/card-brand-icons/jcb';
import { MastercardMark } from '@/features/billing/components/card-brand-icons/mastercard';
import { UnionPayMark } from '@/features/billing/components/card-brand-icons/unionpay';
import { VisaMark } from '@/features/billing/components/card-brand-icons/visa';
import { normalizeCardBrand, type CardBrand } from '@/features/billing/types';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ComponentType } from 'react';

/**
 * Renders the brand mark that the billing service hands back on
 * `PaymentMethod.status.details.card.brand`. The API field is a
 * free-form string (Stripe's vocabulary today) so we accept `string`
 * and run it through `normalizeCardBrand` here rather than asking
 * every caller to remember to.
 *
 * The artwork is sourced from the Apache-2.0 licensed
 * [aaronfagan/svg-credit-card-payment-icons](https://github.com/aaronfagan/svg-credit-card-payment-icons)
 * (mono set), with the source `#393939` recoloured to `currentColor` so it
 * adapts to the theme foreground.
 */

const brandRenderers: Record<CardBrand, ComponentType<{ className?: string }>> = {
  visa: VisaMark,
  mastercard: MastercardMark,
  amex: AmexMark,
  discover: DiscoverMark,
  diners: DinersMark,
  jcb: JcbMark,
  unionpay: UnionPayMark,
  unknown: GenericMark,
};

interface CardBrandIconProps {
  brand: string | undefined | null;
  className?: string;
}

export const CardBrandIcon = ({ brand, className }: CardBrandIconProps) => {
  const Renderer = brandRenderers[normalizeCardBrand(brand)] ?? GenericMark;
  // The mono SVGs already draw a rounded card-shaped body filled with
  // `currentColor`, so the wrapper is just a sizing slot — no border or
  // background of its own, otherwise it looks like a card wrapped in a card.
  // We deliberately don't set a text colour here so the mark inherits from
  // its parent (typically `text-foreground` in the row).
  return (
    <span
      className={cn(
        'text-foreground/80 inline-flex h-6 w-[38px] shrink-0 items-center justify-center',
        className
      )}>
      <Renderer className="h-full w-full" />
    </span>
  );
};
