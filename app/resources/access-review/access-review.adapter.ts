import type { AccessReviewResult, CreateAccessReviewInput } from './access-review.schema';
import type { IoK8sApiAuthorizationV1SelfSubjectAccessReview } from '@/modules/control-plane/authorization';

/**
 * Transform raw API SelfSubjectAccessReview to domain AccessReviewResult type
 */
export function toAccessReviewResult(
  raw: IoK8sApiAuthorizationV1SelfSubjectAccessReview
): AccessReviewResult {
  const { status, spec } = raw;
  return {
    allowed: status?.allowed ?? false,
    denied: status?.denied ?? false,
    namespace: spec?.resourceAttributes?.namespace,
    verb: spec?.resourceAttributes?.verb,
    group: spec?.resourceAttributes?.group,
    resource: spec?.resourceAttributes?.resource,
  };
}

/**
 * Transform CreateAccessReviewInput to API request payload
 */
export function toCreateAccessReviewPayload(
  input: CreateAccessReviewInput
): IoK8sApiAuthorizationV1SelfSubjectAccessReview {
  return {
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectAccessReview',
    spec: {
      resourceAttributes: {
        namespace: input.namespace,
        verb: input.verb,
        group: input.group,
        resource: input.resource,
        name: input.name,
      },
    },
  };
}
