import { type Domain, type DomainList, type CreateDomainInput } from './domain.schema';
import { ComDatumapisNetworkingV1AlphaDomain } from '@/modules/control-plane/networking';
import { generateId } from '@/utils/helpers/text.helper';

/**
 * Transform raw API Domain to domain Domain type
 */
export function toDomain(raw: ComDatumapisNetworkingV1AlphaDomain): Domain {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace ?? '',
    description: raw.metadata?.annotations?.['kubernetes.io/description'],
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    domainName: raw.spec?.domainName ?? '',
    status: raw.status,
    desiredRegistrationRefreshAttempt: raw.spec?.desiredRegistrationRefreshAttempt ?? '',
  };
}

/**
 * Transform raw API list to domain DomainList
 */
export function toDomainList(
  items: ComDatumapisNetworkingV1AlphaDomain[],
  nextCursor?: string
): DomainList {
  return {
    items: items.map(toDomain),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/**
 * Transform CreateDomainInput to API payload
 */
export function toCreateDomainPayload(
  input: CreateDomainInput
): ComDatumapisNetworkingV1AlphaDomain {
  return {
    kind: 'Domain',
    apiVersion: 'networking.datumapis.com/v1alpha',
    metadata: {
      name: input.name ?? generateId(input.domainName),
    },
    spec: {
      domainName: input.domainName,
    },
  };
}

/**
 * Transform update input to API payload
 */
export function toUpdateDomainPayload(domainName: string): {
  kind: string;
  apiVersion: string;
  spec: { domainName: string };
} {
  return {
    kind: 'Domain',
    apiVersion: 'networking.datumapis.com/v1alpha',
    spec: {
      domainName,
    },
  };
}

/**
 * Transform refresh registration to API payload
 */
export function toRefreshRegistrationPayload(): {
  kind: string;
  apiVersion: string;
  spec: { desiredRegistrationRefreshAttempt: string };
} {
  return {
    kind: 'Domain',
    apiVersion: 'networking.datumapis.com/v1alpha',
    spec: {
      desiredRegistrationRefreshAttempt: new Date().toISOString(),
    },
  };
}
