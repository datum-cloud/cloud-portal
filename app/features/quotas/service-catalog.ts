/**
 * INTERIM mirror of the future milo-os/service-catalog `Service` registry.
 * Source of truth for group display names until the catalog + graphql-gateway
 * are deployed. See docs/superpowers/specs/2026-06-08-milo-quota-taxonomy-design.md.
 *
 * Migration: when the catalog ships, replace this module with Service.displayName
 * lookups; the `bridge` shrinks to empty as operators adopt
 * `services.miloapis.com/owner` on their ResourceRegistrations.
 */

export const OTHER_GROUP = 'Other';

/** serviceName (reverse-DNS canonical) → group display name. */
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  'core.miloapis.com': 'Platform Core',
  'notes.miloapis.com': 'Notes',
  'dns.networking.miloapis.com': 'DNS',
  'networking.datumapis.com': 'Networking',
  'resourcemanager.miloapis.com': 'Organization & Projects',
};

/**
 * resourceType → serviceName, ONLY for registrations that have not yet adopted
 * the `services.miloapis.com/owner` label. Remove entries as operators migrate.
 */
const RESOURCE_TYPE_BRIDGE: Record<string, string> = {
  'gateway.networking.k8s.io/gateways': 'networking.datumapis.com',
  'gateway.networking.k8s.io/httproutes': 'networking.datumapis.com',
  'gateway.networking.k8s.io/backendtlspolicies': 'networking.datumapis.com',
  'gateway.envoyproxy.io/securitypolicies': 'networking.datumapis.com',
  'gateway.envoyproxy.io/httproutefilters': 'networking.datumapis.com',
  'gateway.envoyproxy.io/backends': 'networking.datumapis.com',
  'gateway.envoyproxy.io/backendtrafficpolicies': 'networking.datumapis.com',
  'discovery.k8s.io/endpointslices': 'networking.datumapis.com',
  'networking.datumapis.com/httpproxies': 'networking.datumapis.com',
  'networking.datumapis.com/domains': 'networking.datumapis.com',
  'networking.datumapis.com/connectors': 'networking.datumapis.com',
  'networking.datumapis.com/connectoradvertisements': 'networking.datumapis.com',
  'networking.datumapis.com/trafficprotectionpolicies': 'networking.datumapis.com',
  'dns.networking.miloapis.com/dnszones': 'dns.networking.miloapis.com',
  'dns.networking.miloapis.com/dnsrecordsets': 'dns.networking.miloapis.com',
};

/**
 * Resolve a quota's group display name. Prefers the server-authored owner
 * reference, then the interim resourceType bridge, then the Other group.
 */
export function resolveServiceDisplayName(owner: string | undefined, resourceType: string): string {
  const serviceName = owner ?? RESOURCE_TYPE_BRIDGE[resourceType];
  if (!serviceName) {
    return OTHER_GROUP;
  }
  return SERVICE_DISPLAY_NAMES[serviceName] ?? OTHER_GROUP;
}
