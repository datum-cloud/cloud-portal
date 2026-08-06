import type { SuspensionVerdict } from './derive-suspension-verdict';

/**
 * Two severity tiers within ONE amber family — no red anywhere (red reads as
 * breakage/data-loss, and is accusatory for auto-raised fraud flags):
 * - remediable: billing-only, the consumer can fix it — an errand, action-forward.
 * - operatorGated: any other mix — a review; calm, factual, heavier surface.
 */
export type SuspensionTier = 'remediable' | 'operatorGated';

export function getSuspensionTier(verdict: SuspensionVerdict): SuspensionTier {
  return verdict.canSelfRemediate ? 'remediable' : 'operatorGated';
}

/** The strongest true promise per tier (README: billing suspensions lift automatically). */
export function SuspensionTierKeyLine({ tier }: { tier: SuspensionTier }) {
  if (tier === 'remediable') {
    return (
      <>
        Settling the outstanding balance reinstates this project <strong>automatically</strong>.
      </>
    );
  }
  return <>Our team reviews appeals for this type of suspension.</>;
}
