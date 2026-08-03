import { classifyQuotaError, parseQuotaError } from './quota-error';
import { buildQuotaIncreaseRequest } from '@/features/quotas/build-quota-increase-request';
import { logger } from '@/modules/logger';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { openSupportMessage } from '@/utils/open-support-message';
import { toast } from '@datum-cloud/datum-ui/toast';

export interface QuotaToastContext {
  scope: 'org' | 'project';
  orgId?: string;
  projectId?: string;
}

export function showQuotaExceededToast(error: unknown, opts: QuotaToastContext): void {
  const parsed = parseQuotaError(error);
  const serviceScope = opts.scope === 'project' ? ('project' as const) : ('organization' as const);
  const scopeName = opts.scope === 'project' ? opts.projectId : opts.orgId;
  // Guard against a missing scope id — never render a link to /project/undefined/quotas.
  const quotasHref = scopeName
    ? opts.scope === 'project'
      ? getPathWithParams(paths.project.detail.settings.quotas, { projectId: scopeName })
      : getPathWithParams(paths.org.detail.settings.quotas, { orgId: scopeName })
    : undefined;
  const message = error instanceof Error ? error.message : 'Insufficient quota available.';

  toast.error('Quota reached', {
    description: (
      <span data-e2e="quota-exceeded-toast">
        {message}
        {quotasHref && (
          <>
            {' '}
            <a
              href={quotasHref}
              className="font-medium underline"
              data-e2e="quota-toast-view-quotas">
              View quotas
            </a>
          </>
        )}
      </span>
    ),
    duration: 10_000,
    action: parsed.resourceType
      ? {
          label: 'Request increase',
          onClick: () =>
            openSupportMessage(
              buildQuotaIncreaseRequest(parsed.resourceType!, {
                scope: serviceScope,
                name: scopeName,
              })
            ),
        }
      : undefined,
  });
}

/** Drop-in replacement for `toast.error(title, { description: error.message })` in mutation onError. */
export function showMutationErrorToast(
  error: unknown,
  opts: QuotaToastContext & { fallbackTitle: string }
): void {
  if (classifyQuotaError(error) === 'denied') {
    logger.warn('[Quota] quota 403 detected', {
      resourceType: parseQuotaError(error).resourceType,
    });
    showQuotaExceededToast(error, opts);
    return;
  }
  toast.error(opts.fallbackTitle, {
    description: error instanceof Error ? error.message : 'Something went wrong',
  });
}
