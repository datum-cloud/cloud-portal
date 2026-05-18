/**
 * Type-safe enumeration of Kubernetes resource kinds that have Activity
 * surfaces in cloud-portal. Use as the value type for `resourceKinds`
 * filters on `<ResourceActivityFeed>` so we don't typo a string.
 *
 * The link resolver's `RESOURCE_ROUTES` keys form a subset of this union:
 * a kind may be filterable but not yet have a clickable detail page.
 *
 * Add new kinds here when adding Activity surfaces. Keep alphabetized
 * within logical groups for readability.
 */
export type ActivityResourceKind =
  // DNS
  | 'DNSZone'
  | 'DNSRecordSet'
  // Domains
  | 'Domain'
  // Edge / Networking
  | 'HTTPProxy'
  // Metrics / Observability
  | 'ExportPolicy'
  // Security
  | 'Secret'
  // IAM
  | 'ServiceAccount'
  | 'ServiceAccountKey';
