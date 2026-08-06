import { buildSuspensionAppealRequest } from './build-suspension-appeal-request';
import { getSuspensionTier } from './suspension-tier';
import { useProjectSuspension } from './use-project-suspension';
import { useProjectContext } from '@/providers/project.provider';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { openSupportMessage } from '@/utils/open-support-message';
import { Button } from '@datum-cloud/datum-ui/button';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Link } from 'react-router';

/**
 * Matches datum-ui's toast action button styling. `bg-current/10` self-tints
 * from the inherited text color, so `text-current` cancels out Button's own
 * type-driven color — both tiers then pick up SuspensionBar's ambient
 * `text-card-warning-foreground` and render the same subtle fill instead of two
 * different tier colors.
 */
const RECOVERY_CTA_CLASSNAME =
  'rounded-md bg-current/10 px-2.5 py-1 font-medium text-current transition-colors hover:bg-current/20';

/**
 * Tier-branching recovery CTA, used by SuspensionBar:
 * - remediable → "Review billing" deep link. Action-forward warning-family
 *   button (this tier is an errand, and the platform's promise is automatic
 *   reinstatement).
 * - operatorGated → "Appeal" HelpScout prefill. Quiet outline
 *   button — no cheerful styling on a review-tier surface.
 * Renders null unless definitively suspended.
 */
export function SuspensionCta({ className }: { className?: string }) {
  const verdict = useProjectSuspension();
  const { project } = useProjectContext();
  if (!verdict.isSuspended || !project) return null;

  if (getSuspensionTier(verdict) === 'remediable') {
    const billingHref = getPathWithParams(paths.org.detail.billing.root, {
      orgId: project.organizationId,
    });
    return (
      <Button
        type="warning"
        theme="borderless"
        size="small"
        className={cn(RECOVERY_CTA_CLASSNAME, className)}
        data-e2e="suspension-cta-review-billing"
        asChild>
        <Link to={billingHref}>Review billing</Link>
      </Button>
    );
  }

  return (
    <Button
      type="quaternary"
      theme="borderless"
      size="small"
      className={cn(RECOVERY_CTA_CLASSNAME, className)}
      data-e2e="suspension-cta-appeal"
      onClick={() =>
        openSupportMessage(
          buildSuspensionAppealRequest({
            projectName: project.name,
            projectDisplayName: project.displayName,
            reasons: verdict.reasons,
          })
        )
      }>
      Appeal
    </Button>
  );
}
