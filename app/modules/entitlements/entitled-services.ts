/**
 * INTERIM set of services a project must hold an Active ServiceEntitlement
 * for before it can use them. Usage and quota views hide these services when
 * the scope is not entitled; everything else (platform services such as
 * billing or resourcemanager) always shows. Replace with the catalog's own
 * gating signal once `services.miloapis.com` Services are readable through
 * the end-user IAM proxy.
 */
const GATED_SERVICES: ReadonlySet<string> = new Set([
  'compute.datumapis.com',
  'assistant.miloapis.com',
  'interconnect.datumapis.com',
]);

/** True when a service only becomes usable through an Active ServiceEntitlement. */
export function isGatedService(serviceName: string | undefined): serviceName is string {
  return !!serviceName && GATED_SERVICES.has(serviceName);
}

/**
 * The parts of a ServiceEntitlement the visibility rules read. Structural so
 * both the generated SDK type and the raw JSON the client hook fetches fit.
 */
export interface EntitlementLike {
  spec?: { serviceRef?: { name?: string } };
  status?: { phase?: string; serviceName?: string };
}

/**
 * Identifiers an entitlement can be matched on. The controller-stamped
 * canonical `status.serviceName` comes first; `spec.serviceRef.name` is
 * added when it differs, since some entitlements were written with the
 * Service object name instead of the canonical domain.
 */
export function entitlementServiceIds(item: EntitlementLike): string[] {
  const canonical = item.status?.serviceName?.trim();
  const ref = item.spec?.serviceRef?.name?.trim();
  return [...(canonical ? [canonical] : []), ...(ref && ref !== canonical ? [ref] : [])];
}

/**
 * Union the Active entitlement ids reported by several projects.
 *
 * Returns `null` when the scope tells us nothing: every lookup failed, the
 * scope was empty, or no project reported an Active entitlement. Callers
 * treat `null` as "unknown" and fail open, so a broken lookup never blanks a
 * page. Individual failures are skipped so one project cannot hide the rest.
 */
export function unionActiveServiceIds(
  results: PromiseSettledResult<EntitlementLike[]>[]
): Set<string> | null {
  const ids = new Set<string>();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value) {
      if (item.status?.phase !== 'Active') continue;
      for (const id of entitlementServiceIds(item)) ids.add(id);
    }
  }
  return ids.size > 0 ? ids : null;
}

/**
 * Should a service's usage or quotas be shown to this scope?
 *
 * Hidden only when the service is entitlement-gated, the entitlements are
 * known, and none of them names the service. Ungated (platform) services and
 * unknown entitlement state always show.
 */
export function isServiceVisible(
  serviceName: string | undefined,
  entitledServiceIds: ReadonlySet<string> | null
): boolean {
  if (!isGatedService(serviceName) || entitledServiceIds === null) return true;
  return entitledServiceIds.has(serviceName);
}
