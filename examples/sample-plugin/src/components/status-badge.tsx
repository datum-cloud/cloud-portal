import type { InstanceStatus } from '../lib/api';
import { Badge } from '@datum-cloud/datum-ui/badge';

const BADGE_TYPE: Record<InstanceStatus, 'success' | 'warning' | 'secondary'> = {
  Running: 'success',
  Restarting: 'warning',
  Stopped: 'secondary',
};

/**
 * Instance status pill, rendered with the HOST's `@datum-cloud/datum-ui`
 * Badge (a Module Federation shared singleton) so it is pixel-identical to
 * status badges on built-in portal pages. The e2e suite asserts the exact
 * status text and the `data-status` attribute — keep both stable.
 */
export function StatusBadge({ status }: { status: InstanceStatus }) {
  return (
    <Badge
      data-testid="sample-status-badge"
      data-status={status}
      type={BADGE_TYPE[status] ?? 'secondary'}
      theme="light">
      {status}
    </Badge>
  );
}
