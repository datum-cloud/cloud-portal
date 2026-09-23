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

/**
 * A bare dotted field path segment, e.g. `spec.organizationRef` — noise that
 * precedes the actual field-validation message, never the message itself.
 */
const FIELD_PATH_PATTERN = /^[\w]+(?:\.[\w]+)+$/;

/**
 * K8s field-validation messages ("Invalid value: \"x\": <detail>",
 * "Duplicate value: \"x\"") interleave the offending value between two
 * colons. When there IS a trailing detail, prefer it over the label/value
 * noise; when there isn't (a bare Duplicate value error has none), leave the
 * label + value in place since it's the only content the API gave us.
 */
const VALUE_ERROR_PREFIX_PATTERN =
  /^(?:Invalid|Duplicate|Required|Forbidden|NotSupported|TooLong|TooMany) value: "[^"]*": (.+)$/;

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
 * This walks FORWARD through colon-separated segments, stripping only
 * recognized noise prefixes (admission webhook wrapper, resource path,
 * bare field path) from the front, then returns everything that's left —
 * rejoined with ": " so a colon inside the actual message (e.g. "Invalid
 * value: \"x\": already a member") is never mistaken for more noise and
 * silently dropped. A previous backwards-walk implementation returned only
 * the last segment, which chopped messages like that down to a bare quoted
 * value with no explanation.
 *
 * Uses shared resource labels from `resource-labels` for
 * humanizing "not found" messages.
 */
export function parseK8sMessage(raw: string): string {
  if (!raw) return raw;

  const segments = raw.split(': ');

  let i = 0;
  while (i < segments.length - 1) {
    const segment = segments[i].trim();
    if (
      ADMISSION_WEBHOOK_PATTERN.test(segment) ||
      K8S_RESOURCE_PATH_PATTERN.test(segment) ||
      FIELD_PATH_PATTERN.test(segment)
    ) {
      i++;
      continue;
    }
    break;
  }

  const landed = segments[i].trim();
  const notFoundMatch = landed.match(K8S_NOT_FOUND_PATTERN);
  if (notFoundMatch) {
    const label = getResourceLabel(notFoundMatch[1]);
    return `${label} "${notFoundMatch[2]}" not found`;
  }

  let remaining = segments.slice(i).join(': ').trim();
  const valueErrorMatch = remaining.match(VALUE_ERROR_PREFIX_PATTERN);
  if (valueErrorMatch) {
    remaining = valueErrorMatch[1];
  }

  return capitalize(remaining);
}
