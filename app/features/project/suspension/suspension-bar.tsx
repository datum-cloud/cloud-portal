import { suspendedSince } from './derive-suspension-verdict';
import { joinReasonPhrases } from './suspension-copy';
import { SuspensionCta } from './suspension-cta';
import { getSuspensionTier, SuspensionTierKeyLine, type SuspensionTier } from './suspension-tier';
import { useProjectSuspension } from './use-project-suspension';
import { DateTime } from '@/components/date-time';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { TriangleAlertIcon } from 'lucide-react';

/**
 * Both tiers share the design system's semantic warning surface
 * (`bg-card-warning` / `text-card-warning-foreground` — the same pairing as
 * NoteCard and SearchPartialPermissionNote), so the bar tracks the token rather
 * than a hardcoded palette. The token has no dark override by design, which is
 * what keeps the foreground pairing readable in both themes.
 *
 * The token is one surface, so the two-tier distinction moves to the bottom
 * border: operatorGated reads heavier (thicker, higher contrast) than the
 * remediable errand.
 */
const TIER_BAR_CLASSES: Record<SuspensionTier, string> = {
  remediable: 'border-b border-card-warning-foreground/20',
  operatorGated: 'border-b-2 border-card-warning-foreground/45',
};

/**
 * The single suspension surface: a full-width band under the header on every
 * project page (mounted via DashboardLayout's `banner` slot). DangerCard's
 * icon · text · action structure in the amber family — never red (suspension
 * pauses work; nothing is deleted). Renders null unless definitively
 * suspended; unknown/loading show nothing.
 */
export function SuspensionBar() {
  const verdict = useProjectSuspension();
  if (!verdict.isSuspended) return null;

  const tier = getSuspensionTier(verdict);
  const phrases = joinReasonPhrases(verdict.reasons);
  const since = suspendedSince(verdict);

  return (
    <div
      data-e2e="suspension-bar"
      className={cn(
        'bg-card-warning text-card-warning-foreground flex w-full flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6',
        TIER_BAR_CLASSES[tier]
      )}>
      <div className="flex flex-1 items-start gap-3 sm:items-center">
        <Icon
          icon={TriangleAlertIcon}
          className="mt-0.5 size-4 shrink-0 sm:mt-0"
          aria-hidden="true"
        />
        <p role="status" className="text-1xs leading-relaxed">
          <span className="text-sm font-semibold">This project is suspended</span>
          {phrases ? <> — {phrases}</> : null}
          {since ? (
            <>
              , since <DateTime date={since} format="MMM d, yyyy" className="font-medium" />
            </>
          ) : null}
          {'. '}
          {tier === 'operatorGated' ? 'Running work is paused; nothing is deleted. ' : null}
          <SuspensionTierKeyLine tier={tier} />
        </p>
      </div>
      <SuspensionCta className="shrink-0 self-end sm:self-auto" />
    </div>
  );
}
