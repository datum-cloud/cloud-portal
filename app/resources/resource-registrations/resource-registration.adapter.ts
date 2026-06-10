import type { ResourceRegistration } from './resource-registration.schema';
import type { ComMiloapisQuotaV1Alpha1ResourceRegistration } from '@/modules/control-plane/quota';

/**
 * Transform raw API ResourceRegistration to the slim domain type.
 * We only surface the fields the portal needs (the registration's
 * `resourceType` key and its measurement `type`); everything else is
 * left on the wire object for callers that decode the raw response.
 */
export function toResourceRegistration(
  raw: ComMiloapisQuotaV1Alpha1ResourceRegistration
): ResourceRegistration {
  const annotations = raw.metadata?.annotations ?? {};
  const labels = raw.metadata?.labels ?? {};
  return {
    name: raw.metadata?.name ?? '',
    resourceType: raw.spec.resourceType,
    type: raw.spec.type,
    displayName: annotations['kubernetes.io/display-name'],
    description: annotations['kubernetes.io/description'] ?? raw.spec.description,
    // Two registration-authoring patterns stamp different owner-label keys:
    // hand-written registrations use `services.miloapis.com/owner`, while the
    // milo service-catalog quota fan-out stamps `services.miloapis.com/service`.
    // Read both so fan-out services (e.g. compute) group correctly.
    service:
      labels['services.miloapis.com/owner'] ?? labels['services.miloapis.com/service'],
  };
}
