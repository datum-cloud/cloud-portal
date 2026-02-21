/**
 * Central registry of K8s resource kind → human-readable label.
 * Single source of truth used by:
 * - Error message parser (K8s Status messages)
 * - Activity log humanization
 * - Any UI that displays resource types
 */
const RESOURCE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  // Organization-level resources
  organizations: 'Organization',
  users: 'User',
  groups: 'Group',
  roles: 'Role',
  projects: 'Project',
  invitations: 'Invitation',
  members: 'Member',

  // Project-level resources
  domains: 'Domain',
  dnszones: 'DNS Zone',
  dnsrecords: 'DNS Record',
  dnsrecordsets: 'DNS Record Set',
  dnszonediscoveries: 'DNS Zone Discovery',
  httpproxies: 'HTTP Proxy',
  secrets: 'Secret',
  policybindings: 'Policy Binding',
  exportpolicies: 'Export Policy',
});

export function getResourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}
