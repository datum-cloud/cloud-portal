import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { FlaskConical } from 'lucide-react';

/**
 * Visible marker rendered when a mounted plugin is dev-sourced (`devMode`).
 * Dev plugins get relaxed gating (entitlement skipped, RBAC downgraded to
 * warnings), so the badge makes that non-production posture obvious near the
 * page header.
 */
export function DevPluginBadge({ className }: { className?: string }) {
  return (
    <Badge type="warning" theme="light" className={className} data-testid="dev-plugin-badge">
      <Icon icon={FlaskConical} className="size-3" />
      Dev plugin
    </Badge>
  );
}
