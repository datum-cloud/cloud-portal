import type {
  PolicyBinding,
  PolicyBindingList,
  CreatePolicyBindingInput,
  PolicyBindingSubjectKindValue,
} from './policy-binding.schema';
import { POLICY_RESOURCES } from '@/features/policy-binding/form/constants';
import type { ComMiloapisIamV1Alpha1PolicyBinding } from '@/modules/control-plane/iam';
import { sanitizeForK8s } from '@/utils/helpers/format.helper';
import { generateRandomString } from '@/utils/helpers/text.helper';

/**
 * Transform raw API PolicyBinding to domain PolicyBinding type
 */
export function toPolicyBinding(raw: ComMiloapisIamV1Alpha1PolicyBinding): PolicyBinding {
  const { metadata, spec, status } = raw;

  // Map resourceSelector with proper optional handling
  const rawResourceSelector = spec?.resourceSelector;
  const resourceSelector = rawResourceSelector
    ? {
        resourceKind: rawResourceSelector.resourceKind
          ? {
              apiGroup: rawResourceSelector.resourceKind.apiGroup,
              kind: rawResourceSelector.resourceKind.kind,
            }
          : undefined,
        resourceRef: rawResourceSelector.resourceRef
          ? {
              apiGroup: rawResourceSelector.resourceRef.apiGroup,
              kind: rawResourceSelector.resourceRef.kind,
              name: rawResourceSelector.resourceRef.name,
              namespace: rawResourceSelector.resourceRef.namespace,
              uid: rawResourceSelector.resourceRef.uid,
            }
          : undefined,
      }
    : undefined;

  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    namespace: metadata?.namespace ?? '',
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp ?? '',
    subjects: (spec?.subjects ?? []).map((subject) => ({
      kind: subject.kind as PolicyBindingSubjectKindValue,
      name: subject.name,
      uid: subject.uid,
      namespace: subject.namespace,
    })),
    roleRef: spec?.roleRef
      ? {
          name: spec.roleRef.name,
          namespace: spec.roleRef.namespace,
        }
      : undefined,
    resourceSelector,
    status: status as any,
  };
}

/**
 * Transform raw API list to domain PolicyBindingList
 */
export function toPolicyBindingList(
  items: ComMiloapisIamV1Alpha1PolicyBinding[],
  nextCursor?: string
): PolicyBindingList {
  return {
    items: items.map(toPolicyBinding),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/**
 * Format policy binding payload for create/update
 */
function formatPolicyBindingPayload(
  input: CreatePolicyBindingInput,
  isEdit: boolean = false
): ComMiloapisIamV1Alpha1PolicyBinding {
  const resource = POLICY_RESOURCES[input.resource.ref as keyof typeof POLICY_RESOURCES];

  const formatted: ComMiloapisIamV1Alpha1PolicyBinding = {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'PolicyBinding',
    spec: {
      resourceSelector: {
        resourceRef: {
          apiGroup: resource.apiGroup,
          kind: resource.kind,
          name: input.resource.name,
          uid: input.resource.uid ?? '',
        },
      },
      roleRef: {
        name: input.role,
        namespace: input.roleNamespace ?? 'datum-cloud',
      },
      subjects: input.subjects.map((subject) => ({
        kind: subject.kind as 'User' | 'Group',
        name: subject.name,
        uid: subject.uid ?? '',
      })),
    },
  };

  if (!isEdit) {
    const sanitizedKind = sanitizeForK8s(resource.kind);
    const sanitizedResourceName = sanitizeForK8s(input.resource.name);
    const randomSuffix = generateRandomString(6);

    const name = `${sanitizedKind}-${sanitizedResourceName}-${randomSuffix}`;

    formatted.metadata = {
      name,
    };
  }

  return formatted;
}

/**
 * Transform CreatePolicyBindingInput to API create payload
 */
export function toCreatePolicyBindingPayload(
  input: CreatePolicyBindingInput
): ComMiloapisIamV1Alpha1PolicyBinding {
  return formatPolicyBindingPayload(input, false);
}

/**
 * Transform UpdatePolicyBindingInput to API patch payload
 */
export function toUpdatePolicyBindingPayload(
  input: CreatePolicyBindingInput
): ComMiloapisIamV1Alpha1PolicyBinding {
  return formatPolicyBindingPayload(input, true);
}
