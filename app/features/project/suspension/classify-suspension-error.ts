import { AppError } from '@/utils/errors/app-error';

/**
 * Detects milo's suspension-admission 403 via the typed channel: a K8s
 * Status.details.causes[] entry whose reason is "ProjectSuspended"
 * (milo's ProjectSuspendedCause). The axios interceptor already parses
 * causes into AppError.details with cause.reason → detail.code
 * (app/modules/axios/k8s-error.ts:78-97). No message-anchor matching —
 * contrast quota-error.ts, whose anchors are "not a contract".
 */
export function isProjectSuspendedError(error: unknown): boolean {
  if (!(error instanceof AppError) || error.status !== 403) return false;
  return (error.details ?? []).some((d) => d.code === 'ProjectSuspended');
}
