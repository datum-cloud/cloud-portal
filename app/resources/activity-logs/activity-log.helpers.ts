import type { ActivityLogFilterParams, ActivityLogScope } from './activity-log.schema';
import { getResourceLabel } from '@/utils/helpers/resource-labels';

// Re-export for consumers that imported from this module
export { getResourceLabel };

// ============================================
// RESOURCE SCOPES (Scope Membership Only)
// ============================================

type ScopeType = ActivityLogScope['type'];

/**
 * Maps resource keys to the scopes where they appear in filter options.
 * Labels come from the shared resource-labels utility.
 *
 * To add a new resource:
 * 1. Add its label in app/utils/helpers/resource-labels.ts
 * 2. Add its scope membership here
 */
const RESOURCE_SCOPES: Record<string, ScopeType[]> = {
  // Organization-level resources
  organizations: ['organization'],
  users: ['organization'],
  groups: ['organization'],
  roles: ['organization'],
  projects: ['organization'],
  invitations: ['organization'],
  members: ['organization'],

  // Project-level resources
  domains: ['project'],
  dnszones: ['project'],
  dnsrecords: ['project'],
  dnsrecordsets: ['project'],
  httpproxies: ['project'],
  secrets: ['project'],
  dnszonediscoveries: ['project'],
};

/**
 * Gets all resource keys that belong to a specific scope.
 */
export function getResourcesByScope(scopeType: ScopeType): string[] {
  return Object.entries(RESOURCE_SCOPES)
    .filter(([, scopes]) => scopes.includes(scopeType))
    .map(([key]) => key);
}

/**
 * Gets all registered resource keys.
 */
export function getAllResources(): string[] {
  return Object.keys(RESOURCE_SCOPES);
}

// ============================================
// VERB REGISTRY
// ============================================

/**
 * Maps API verbs to past tense for humanization.
 */
const VERB_PAST_TENSE: Record<string, string> = {
  create: 'Added',
  update: 'Modified',
  delete: 'Deleted',
  patch: 'Modified',
  get: 'Viewed',
  list: 'Listed',
};

/**
 * Verbs available for filtering in the UI.
 * Includes both modify operations (create, update, delete, patch) and read operations (get, list).
 * Read operations are available but not selected by default.
 */
const FILTERABLE_VERBS = ['create', 'update', 'delete', 'patch', 'get', 'list'] as const;

/**
 * Maps filter display labels to their constituent verbs.
 * Allows grouping multiple verbs under a single UI option.
 */
const LABEL_TO_VERBS: Record<string, string[]> = {
  Added: ['create'],
  Modified: ['update', 'patch'],
  Deleted: ['delete'],
  Viewed: ['get'],
  Listed: ['list'],
};

// ============================================
// FILTER OPTIONS
// ============================================

/** Filter option type for UI components */
export interface FilterOption {
  label: string;
  value: string;
}

/**
 * Returns action filter options derived from VERB_PAST_TENSE.
 * Groups verbs by their display label and uses the label as the value.
 * When a filter option is selected, all verbs under that label are included.
 *
 * Example: "Modified" represents both 'update' and 'patch' operations.
 */
export function getActionFilterOptions(): FilterOption[] {
  const labelsSeen = new Set<string>();
  const options: FilterOption[] = [];

  for (const verb of FILTERABLE_VERBS) {
    const label = VERB_PAST_TENSE[verb];
    if (!labelsSeen.has(label)) {
      labelsSeen.add(label);
      options.push({
        label,
        value: label,
      });
    }
  }

  return options;
}

/**
 * Returns resource filter options based on the current scope.
 *
 * - organization: IAM and org-level resources
 * - project: Edge and project-level resources
 * - user: All resources (user can interact with everything)
 */
export function getResourceFilterOptions(scopeType: ScopeType): FilterOption[] {
  // User scope sees all resources
  const resources = scopeType === 'user' ? getAllResources() : getResourcesByScope(scopeType);

  return resources.map((key) => ({
    label: getResourceLabel(key),
    value: key,
  }));
}

// ============================================
// HUMANIZATION
// ============================================

/**
 * Humanizes an action based on verb and resource.
 *
 * @example
 * humanizeAction('create', 'domains') // "Added a Domain"
 * humanizeAction('delete', 'dnszones') // "Deleted a DNS Zone"
 */
export function humanizeAction(verb: string, resource: string): string {
  const verbText = VERB_PAST_TENSE[verb] || verb.charAt(0).toUpperCase() + verb.slice(1);
  // Use shared label if available, otherwise remove trailing 's' for singular form
  const label = getResourceLabel(resource);
  const singularLabel = label !== resource ? label : resource.replace(/s$/, '');

  return `${verbText} a ${singularLabel}`;
}

/**
 * Formats resource details for display.
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

// ============================================
// CEL FILTER BUILDING
// ============================================

/**
 * Default CEL filter to exclude system/internal activity.
 *
 * Filters out:
 * - System accounts (usernames starting with 'system:')
 * - auditlogqueries activity (querying logs creates its own activity, causing spam)
 */
export const DEFAULT_FILTER =
  "user.username.startsWith('system:') == false && objectRef.resource != 'auditlogqueries'";

/**
 * Builds a CEL filter string from UI filter parameters.
 * Combines search, action, and resource filters with AND logic.
 *
 * Search coverage:
 * - user.username (skipped for 'user' scope - it's always the same user)
 * - objectRef.name (resource name, e.g., "example.com")
 * - objectRef.resource (resource type, e.g., "domains")
 * - objectRef.namespace (namespace)
 * - verb (action, e.g., "create")
 *
 * @example
 * buildCELFilter({ search: 'domain' })
 * // "(user.username.contains('domain') || objectRef.name.contains('domain') || ...)"
 *
 * buildCELFilter({ search: 'domain', scopeType: 'user' })
 * // "(objectRef.name.contains('domain') || objectRef.resource.contains('domain') || ...)"
 */
export function buildCELFilter(params: ActivityLogFilterParams): string | undefined {
  const conditions: string[] = [];

  // Search: across multiple fields
  if (params.search?.trim()) {
    const escaped = params.search.trim().replace(/'/g, "\\'");
    const searchConditions: string[] = [];

    // Include user.username search only for non-user scopes
    if (params.scopeType !== 'user') {
      searchConditions.push(`user.username.contains('${escaped}')`);
    }

    // Always search these fields
    searchConditions.push(
      `objectRef.name.contains('${escaped}')`,
      `objectRef.resource.contains('${escaped}')`,
      `objectRef.namespace.contains('${escaped}')`,
      `verb.contains('${escaped}')`
    );

    conditions.push(`(${searchConditions.join(' || ')})`);
  }

  // Action filter: verb in [...]
  if (params.actions?.length) {
    const actionsArray = Array.isArray(params.actions) ? params.actions : [params.actions];

    // Expand labels to verbs (e.g., 'Modified' -> ['update', 'patch'])
    const allVerbs = new Set<string>();
    for (const action of actionsArray) {
      const verbs = LABEL_TO_VERBS[action];
      if (verbs) {
        verbs.forEach((v) => allVerbs.add(v));
      } else {
        // Fallback: treat as a verb directly (for backward compatibility)
        allVerbs.add(action);
      }
    }

    const verbList = Array.from(allVerbs)
      .map((v) => `'${v}'`)
      .join(', ');
    conditions.push(`verb in [${verbList}]`);
  }

  // Resource filter: objectRef.resource in [...]
  if (params.resources?.length) {
    const resourcesArray = Array.isArray(params.resources) ? params.resources : [params.resources];
    const resourceList = resourcesArray.map((r) => `'${r}'`).join(', ');
    conditions.push(`objectRef.resource in [${resourceList}]`);
  }

  return conditions.length > 0 ? conditions.join(' && ') : undefined;
}

/**
 * Combines user-provided filter with default system exclusions.
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
