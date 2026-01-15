import type { ActivityLogFilterParams } from './activity-log.schema';

/**
 * Maps verb to past tense for humanization.
 */
const VERB_PAST_TENSE: Record<string, string> = {
  create: 'Added',
  update: 'Updated',
  delete: 'Deleted',
  patch: 'Modified',
  get: 'Viewed',
  list: 'Listed',
};

/**
 * Maps resource names to human-readable singular forms.
 */
const RESOURCE_LABELS = {
  dnszones: 'DNS zone',
  dnsrecords: 'DNS record',
  dnsrecordsets: 'DNS record set',
  httpproxies: 'HTTP proxy',
  domains: 'Domain',
  projects: 'Project',
  users: 'User',
  groups: 'Group',
  roles: 'Role',
  secrets: 'Secret',
  invitations: 'Invitation',
  members: 'Member',
  namespaces: 'Namespace',
  organizations: 'Organization',
  dnszonediscoveries: 'DNS zone discovery',
} as const;

/** Type-safe resource key derived from RESOURCE_LABELS */
type ResourceKey = keyof typeof RESOURCE_LABELS;

/**
 * Type guard to check if a string is a valid ResourceKey.
 */
function isResourceKey(key: string): key is ResourceKey {
  return key in RESOURCE_LABELS;
}

/**
 * Safely get label for a resource key, with fallback.
 */
function getResourceLabel(resource: string): string {
  return isResourceKey(resource) ? RESOURCE_LABELS[resource] : resource;
}

/**
 * Verbs available for filtering in the UI.
 * Subset of VERB_PAST_TENSE - excludes 'get' and 'list' as they're less relevant for activity logs.
 */
const FILTERABLE_VERBS = ['create', 'update', 'delete', 'patch'] as const;

/**
 * Organization-level resource keys for filtering.
 * Type-safe: only allows keys that exist in RESOURCE_LABELS.
 */
const ORG_RESOURCE_KEYS: readonly ResourceKey[] = [
  'organizations',
  'users',
  'groups',
  'roles',
  'projects',
  'invitations',
  'members',
];

/**
 * Project-level resource keys for filtering.
 * Type-safe: only allows keys that exist in RESOURCE_LABELS.
 */
const PROJECT_RESOURCE_KEYS: readonly ResourceKey[] = [
  'domains',
  'dnszones',
  'dnsrecords',
  'dnsrecordsets',
  'httpproxies',
  'secrets',
  'dnszonediscoveries',
];

/** Filter option type for UI components */
export interface FilterOption {
  label: string;
  value: string;
}

/**
 * Returns action filter options derived from VERB_PAST_TENSE.
 * Maps to CEL: verb in ['create', 'update', ...]
 */
export function getActionFilterOptions(): FilterOption[] {
  return FILTERABLE_VERBS.map((verb) => ({
    label: VERB_PAST_TENSE[verb],
    value: verb,
  }));
}

/**
 * Converts resource keys to filter options using RESOURCE_LABELS.
 * Uses singular form to match formatDetails display.
 */
function toFilterOptions(keys: readonly ResourceKey[]): FilterOption[] {
  return keys.map((key) => {
    const label = RESOURCE_LABELS[key];
    // Capitalize first letter for display (singular form)
    return {
      label,
      value: key,
    };
  });
}

/**
 * Returns resource filter options based on the current scope.
 *
 * Organization scope: IAM and org-level resources
 * Project scope: Edge and project-level resources
 * User scope: All resources (user can interact with both)
 *
 * @param scopeType - The current scope type
 */
export function getResourceFilterOptions(
  scopeType: 'organization' | 'project' | 'user'
): FilterOption[] {
  switch (scopeType) {
    case 'organization':
      return toFilterOptions(ORG_RESOURCE_KEYS);
    case 'project':
      return toFilterOptions(PROJECT_RESOURCE_KEYS);
    case 'user':
      return [...toFilterOptions(ORG_RESOURCE_KEYS), ...toFilterOptions(PROJECT_RESOURCE_KEYS)];
    default:
      return [];
  }
}

/**
 * Humanizes an action based on verb and resource.
 * Dynamically generates human-readable text from verb and resource labels.
 *
 * @param verb - The API verb (create, update, delete, etc.)
 * @param resource - The resource type (domains, dnszones, etc.)
 * @returns Human-readable action string
 *
 * @example
 * humanizeAction('create', 'domains') // "Created a domain"
 * humanizeAction('delete', 'dnszones') // "Deleted a DNS zone"
 */
export function humanizeAction(verb: string, resource: string): string {
  const verbText = VERB_PAST_TENSE[verb] || verb.charAt(0).toUpperCase() + verb.slice(1);
  const resourceText = isResourceKey(resource)
    ? RESOURCE_LABELS[resource]
    : resource.replace(/s$/, '');

  return `${verbText} a ${resourceText}`;
}

/**
 * Formats resource details for display.
 *
 * @param resource - The resource type
 * @param resourceName - The specific resource name
 * @returns Formatted details string
 *
 * @example
 * formatDetails('domains', 'example.com') // "Domain: example.com"
 */
export function formatDetails(resource: string, resourceName: string): string {
  const label = getResourceLabel(resource);

  if (!resourceName) {
    return label;
  }

  return `${label}: ${resourceName}`;
}

/**
 * Builds a CEL filter string from UI filter parameters.
 * Combines search, action, and resource filters with AND logic.
 *
 * @param params - Filter parameters from UI
 * @returns CEL filter string or undefined if no filters
 *
 * @example
 * buildCELFilter({ search: 'john' })
 * // "(user.username.contains('john') || objectRef.name.contains('john'))"
 *
 * buildCELFilter({ actions: ['create', 'delete'], resources: ['domains'] })
 * // "verb in ['create', 'delete'] && objectRef.resource in ['domains']"
 */
export function buildCELFilter(params: ActivityLogFilterParams): string | undefined {
  const conditions: string[] = [];

  // Search: across user and resource name
  if (params.search?.trim()) {
    const escaped = params.search.trim().replace(/'/g, "\\'");
    conditions.push(
      `(user.username.contains('${escaped}') || objectRef.name.contains('${escaped}'))`
    );
  }

  // Action filter: verb in [...]
  // Normalize to array in case URL param comes as string
  if (params.actions?.length) {
    const actionsArray = Array.isArray(params.actions) ? params.actions : [params.actions];
    const verbList = actionsArray.map((a) => `'${a}'`).join(', ');
    conditions.push(`verb in [${verbList}]`);
  }

  // Resource filter: objectRef.resource in [...]
  // Normalize to array in case URL param comes as string
  if (params.resources?.length) {
    const resourcesArray = Array.isArray(params.resources) ? params.resources : [params.resources];
    const resourceList = resourcesArray.map((r) => `'${r}'`).join(', ');
    conditions.push(`objectRef.resource in [${resourceList}]`);
  }

  return conditions.length > 0 ? conditions.join(' && ') : undefined;
}

/**
 * Default CEL filter to exclude system/internal activity.
 * Filters out:
 * - System accounts (usernames starting with 'system:')
 * - auditlogqueries activity (querying logs creates its own activity, causing spam)
 *
 * This ensures users only see human-initiated actions by default.
 */
export const DEFAULT_FILTER =
  "user.username.startsWith('system:') == false && objectRef.resource != 'auditlogqueries'";

/**
 * Combines user-provided filter with system user exclusion.
 *
 * @param userFilter - Optional CEL filter from UI
 * @param excludeSystemUsers - Whether to exclude system users (default: true)
 * @returns Combined CEL filter string or undefined if no filters
 */
export function buildCombinedFilter(
  userFilter?: string,
  excludeSystemUsers = true
): string | undefined {
  if (!excludeSystemUsers && !userFilter) {
    return undefined;
  }

  if (!excludeSystemUsers) {
    return userFilter;
  }

  if (!userFilter) {
    return DEFAULT_FILTER;
  }

  return `(${DEFAULT_FILTER}) && (${userFilter})`;
}
