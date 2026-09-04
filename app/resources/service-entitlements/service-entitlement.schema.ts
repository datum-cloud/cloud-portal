import type { ComMiloapisServicesV1Alpha1ServiceEntitlement } from '@/modules/control-plane/services';

/**
 * Networking catalog identity.
 *
 * `serviceName` is the canonical reverse-DNS id (`status.serviceName`).
 * `serviceRefName` is the Service object's `metadata.name` — the value
 * ServiceEntitlement.spec.serviceRef.name must use. The webhook looks up
 * the Service by object name, not by spec.serviceName.
 */
export const NETWORKING_SERVICE = {
  serviceName: 'networking.datumapis.com',
  serviceRefName: 'networking-datumapis-com',
} as const;

export const NETWORKING_SERVICE_NAME = NETWORKING_SERVICE.serviceName;
export const NETWORKING_SERVICE_REF_NAME = NETWORKING_SERVICE.serviceRefName;
export const NETWORKING_SERVICE_IDS = [
  NETWORKING_SERVICE.serviceName,
  NETWORKING_SERVICE.serviceRefName,
] as const;

export type ServiceEntitlement = ComMiloapisServicesV1Alpha1ServiceEntitlement;
