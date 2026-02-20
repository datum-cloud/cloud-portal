import { getResourceLabel } from '@/utils/helpers/resource-labels';

/**
 * K8s resource path pattern: `group.api.com "name" is reason`
 * Examples:
 *   - projects.resourcemanager.miloapis.com "jinja-otoke-tkr5rh" is forbidden
 *   - domains.networking.datumapis.com "hiyahya-dev" is forbidden
 *   - dnszones.dns.networking.miloapis.com "example" not found
 */
const K8S_RESOURCE_PATH_PATTERN = /^[\w.-]+\.[\w.-]+\.\w+ "[^"]+" (?:is \w+|not found)$/;

/**
 * Admission webhook prefix pattern
 * Example: admission webhook "vdomain-v1alpha.kb.io" denied the request
 */
const ADMISSION_WEBHOOK_PATTERN = /^admission webhook "[^"]+" denied the request$/;

/**
 * K8s "not found" single-segment pattern: `resource.group.api.com "name" not found`
 * Captures the resource kind (e.g., "dnszones") and the quoted resource name.
 * The resource kind is the first dot-separated segment before the API group.
 */
const K8S_NOT_FOUND_PATTERN = /^(\w+)\.[\w.-]+ "([^"]+)" not found$/;

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Parse a raw K8s Status message to extract the user-friendly portion.
 *
 * K8s messages are often nested with colons:
 *   admission webhook "x" denied the request: resource.group.com "name" is reason: actual message
 *
 * This parser walks backwards through colon-separated segments, skipping
 * admission webhook prefixes and K8s resource path segments, and returns
 * the deepest meaningful segment.
 *
 * Uses shared resource labels from `resource-labels` for
 * humanizing "not found" messages.
 */
export function parseK8sMessage(raw: string): string {
  if (!raw) return raw;

  // Split on ": " to handle nested K8s messages
  const segments = raw.split(': ');

  // Single segment — check for K8s not-found pattern
  if (segments.length === 1) {
    const notFoundMatch = raw.match(K8S_NOT_FOUND_PATTERN);
    if (notFoundMatch) {
      const label = getResourceLabel(notFoundMatch[1]);
      return `${label} "${notFoundMatch[2]}" not found`;
    }
    return raw;
  }

  // Walk backwards to find the first meaningful segment
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i].trim();

    // Humanize K8s "not found" resource path before skipping
    const notFoundMatch = segment.match(K8S_NOT_FOUND_PATTERN);
    if (notFoundMatch) {
      const label = getResourceLabel(notFoundMatch[1]);
      return `${label} "${notFoundMatch[2]}" not found`;
    }

    // Skip other K8s resource path segments (e.g., "is forbidden")
    if (K8S_RESOURCE_PATH_PATTERN.test(segment)) continue;

    // Skip admission webhook prefixes
    if (ADMISSION_WEBHOOK_PATTERN.test(segment)) continue;

    return capitalize(segment);
  }

  // Fallback: return the last segment capitalized
  return capitalize(segments[segments.length - 1].trim());
}
