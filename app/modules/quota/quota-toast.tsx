import { classifyQuotaError, parseQuotaError } from './quota-error';
import { isProjectReadOnlyError } from '@/features/project/read-only/project-read-only-error';
import { isProjectSuspendedError } from '@/features/project/suspension/classify-suspension-error';
import { showProjectSuspendedToast } from '@/features/project/suspension/suspension-toast';
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

/**
 * Drop-in replacement for `toast.error(title, { description: error.message })` in mutation onError.
 *
 * `fallbackDescription` lets a caller keep its own domain-specific formatting
 * for the generic branch without losing the suspension/quota handling above it
 * (e.g. the DNS record form's `formatDnsError`). Only the generic branch uses
 * it — suspension and quota own their copy.
 */
export function showMutationErrorToast(
  error: unknown,
  opts: QuotaToastContext & { fallbackTitle: string; fallbackDescription?: string }
): void {
  // Suspension outranks quota: a suspended project's writes 403 with
  // ProjectSuspended regardless of quota headroom. ProjectReadOnlyError is the
  // client-side equivalent from useGuardedMutation — it never reaches the
  // server, so it carries no K8s Status and isProjectSuspendedError cannot see
  // it. Both render the same toast, which dedupes on a stable id, so a caller
  // reaching here after the gate already toasted updates that one toast.
  if (isProjectReadOnlyError(error) || isProjectSuspendedError(error)) {
    showProjectSuspendedToast({ projectName: opts.projectId });
    return;
  }
  if (classifyQuotaError(error) === 'denied') {
    logger.warn('[Quota] quota 403 detected', {
      resourceType: parseQuotaError(error).resourceType,
    });
    showQuotaExceededToast(error, opts);
    return;
  }
  toast.error(opts.fallbackTitle, {
    description:
      opts.fallbackDescription ?? (error instanceof Error ? error.message : 'Something went wrong'),
  });
}
