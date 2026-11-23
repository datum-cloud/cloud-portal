import type { ServiceEntitlement } from './service-entitlement.schema';

/**
 * Identifiers a service name may match on an entitlement. Prefer the
 * controller-stamped canonical `status.serviceName`; also accept
 * `spec.serviceRef.name` (Service object name or canonical).
 */
export function entitlementServiceIds(item: ServiceEntitlement): string[] {
  const ids: string[] = [];
  const canonical = item.status?.serviceName?.trim();
  const ref = item.spec?.serviceRef?.name?.trim();
  if (canonical) ids.push(canonical);
  if (ref && ref !== canonical) ids.push(ref);
  return ids;
}

/**
 * Unique service ids across the entitlements whose phase is Active.
 *
 * Matching uses `status.serviceName` and `spec.serviceRef.name`, never
 * `metadata.name`, which is an opaque object name such as
 * `my-project--compute-miloapis-com`.
 */
export function activeEntitlementServiceIds(items: readonly ServiceEntitlement[]): string[] {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.status?.phase !== 'Active') continue;
    for (const id of entitlementServiceIds(item)) ids.add(id);
  }
  return [...ids];
}

export function findEntitlementForService(
  items: readonly ServiceEntitlement[],
  serviceIds: string | readonly string[]
): ServiceEntitlement | undefined {
  const wanted = new Set(typeof serviceIds === 'string' ? [serviceIds] : serviceIds);
  return items.find((item) => entitlementServiceIds(item).some((id) => wanted.has(id)));
}

/** Catalog convention: `{project}--{service-slug}` with dots replaced by dashes. */
export function entitlementObjectName(projectId: string, serviceName: string): string {
  return `${projectId}--${serviceName.replaceAll('.', '-')}`;
}

export function toCreateServiceEntitlementPayload(
  projectId: string,
  serviceName: string
): ServiceEntitlement {
  return {
    apiVersion: 'services.miloapis.com/v1alpha1',
    kind: 'ServiceEntitlement',
    metadata: { name: entitlementObjectName(projectId, serviceName) },
    spec: { serviceRef: { name: serviceName } },
  };
}
