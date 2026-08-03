import { AppError } from '@/utils/errors/app-error';

/** Stable message anchors from the Milo quota engine (hardcoded Go literals — not a contract; fail gracefully). */
export const QUOTA_DENIED_ANCHORS = [
  'Insufficient quota resources',
  "You've reached your quota for this resource type",
] as const;

const RETRYABLE_ANCHORS = [
  'took too long to be checked against your quota',
  'still cleaning up from a previous attempt',
  'Something went wrong while checking your quota',
] as const;

const MISCONFIGURED_ANCHOR = 'Quota enforcement for this resource type is misconfigured';

/** `dnszones.dns.networking.miloapis.com "name" is forbidden:` — the resource identity parseK8sMessage strips. */
const FORBIDDEN_PREFIX = /^([a-z0-9-]+)\.([a-z0-9.-]+) "[^"]+" is forbidden:/;

export type QuotaErrorKind = 'denied' | 'retryable' | 'misconfigured';

export function classifyQuotaError(error: unknown): QuotaErrorKind | null {
  if (!(error instanceof AppError) || error.status !== 403) return null;
  const message = error.originalMessage ?? error.message;
  if (QUOTA_DENIED_ANCHORS.some((a) => message.includes(a))) return 'denied';
  if (message.includes(MISCONFIGURED_ANCHOR)) return 'misconfigured';
  if (RETRYABLE_ANCHORS.some((a) => message.includes(a))) return 'retryable';
  return null;
}

export function isQuotaError(error: unknown): boolean {
  return classifyQuotaError(error) !== null;
}

export function parseQuotaError(error: unknown): {
  group?: string;
  resource?: string;
  resourceType?: string;
} {
  if (!(error instanceof AppError)) return {};
  // k8sDetails.kind carries the PLURAL resource — a NewForbidden quirk, not the Kind.
  let group = error.k8sDetails?.group;
  let resource = error.k8sDetails?.kind;
  if ((!group || !resource) && error.originalMessage) {
    const match = FORBIDDEN_PREFIX.exec(error.originalMessage);
    if (match) {
      resource ??= match[1];
      group ??= match[2];
    }
  }
  if (!group || !resource) return { group, resource };
  return { group, resource, resourceType: `${group}/${resource}` };
}
