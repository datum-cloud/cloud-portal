import type { QuotaScope } from '../types';
import { useResourceQuota } from '../use-resource-quota';
import { buildQuotaIncreaseRequest } from '@/features/quotas/build-quota-increase-request';
import { usePermissions } from '@/modules/rbac';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { openSupportMessage } from '@/utils/open-support-message';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { TriangleAlertIcon } from 'lucide-react';
import { Link } from 'react-router';

export function QuotaExhaustedAlert({
  resource,
  group,
  scope,
  className,
}: {
  resource: string;
  group: string;
  scope: QuotaScope;
  className?: string;
}) {
  const verdict = useResourceQuota({ resource, group, scope });
  const { organizationId, projectId } = usePermissions();
  if (!verdict.denied) return null;

  const resourceType = `${group}/${resource}`;
  const label = verdict.registration?.displayName ?? resourceType;
  const quotasHref =
    scope === 'project'
      ? getPathWithParams(paths.project.detail.settings.quotas, { projectId })
      : getPathWithParams(paths.org.detail.settings.quotas, { orgId: organizationId });
  const serviceScope = scope === 'project' ? ('project' as const) : ('organization' as const);
  const scopeName = scope === 'project' ? projectId : organizationId;

  return (
    <Alert variant="warning" className={className} data-e2e="quota-exhausted-alert">
      <Icon icon={TriangleAlertIcon} className="size-4" />
      <AlertTitle>
        {label} quota reached ({verdict.allocated}/{verdict.limit})
      </AlertTitle>
      <AlertDescription>
        Delete unused resources to free up capacity, or{' '}
        <Link to={quotasHref} className="underline" data-e2e="quota-alert-view-quotas">
          view your quotas
        </Link>
        .
      </AlertDescription>
      <Button
        type="quaternary"
        theme="outline"
        size="small"
        className="mt-2"
        data-e2e="quota-alert-request-increase"
        onClick={() =>
          openSupportMessage(
            buildQuotaIncreaseRequest(resourceType, { scope: serviceScope, name: scopeName })
          )
        }>
        Request increase
      </Button>
    </Alert>
  );
}
