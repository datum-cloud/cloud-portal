import { AppError } from '@/utils/errors/app-error';

/**
 * milo's EmailNotVerifiedCause, emitted by the EmailVerificationEnforcement
 * admission plugin. A ValidatingAdmissionPolicy cannot set one — its `reason`
 * is limited to the built-in enum — which is why enforcement is a plugin.
 */
export const EMAIL_NOT_VERIFIED_CAUSE = 'EmailNotVerified';

/**
 * Server-side: does this raw 403 body carry the verification cause?
 *
 * Reads the K8s Status directly because the proxy sees the response before the
 * axios interceptor has parsed anything. Deliberately not a substring match on
 * the body — `causes[].type` is the typed channel, and matching the message
 * would break the moment the wording changes.
 */
export function isEmailNotVerifiedDenial(body: string): boolean {
  try {
    const status = JSON.parse(body) as {
      details?: { causes?: Array<{ type?: string }> };
    };
    return (status.details?.causes ?? []).some((c) => c.type === EMAIL_NOT_VERIFIED_CAUSE);
  } catch {
    return false;
  }
}

/**
 * Client-side: same denial, after the axios interceptor has mapped
 * `cause.reason` onto `AppError.details[].code`
 * (app/modules/axios/k8s-error.ts:78-97). Mirrors isProjectSuspendedError.
 */
export function isEmailNotVerifiedError(error: unknown): boolean {
  if (!(error instanceof AppError) || error.status !== 403) return false;
  return (error.details ?? []).some((d) => d.code === EMAIL_NOT_VERIFIED_CAUSE);
}
