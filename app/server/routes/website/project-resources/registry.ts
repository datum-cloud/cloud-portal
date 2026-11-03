/**
 * A resource type the website may list: the public `key` used in the URL, the
 * K8s resource it maps to, and the annotation holding its display name.
 */
export interface WebsiteResourceType {
  key: string;
  group: string;
  version: string;
  plural: string;
  namespace: string;
  displayNameAnnotation: string;
}

/**
 * Static allowlist of resource types the website endpoint may list. This is
 * the security boundary: only keys defined here are ever resolved.
 */
const RESOURCE_TYPES: Readonly<Record<string, WebsiteResourceType>> = Object.freeze({
  albs: Object.freeze({
    key: 'albs',
    group: 'networking.datumapis.com',
    version: 'v1alpha',
    plural: 'httpproxies',
    namespace: 'default',
    displayNameAnnotation: 'app.kubernetes.io/name',
  }),
});

/** Looks up an allowlisted type by its public key; inherited keys never resolve. */
export function resolveResourceType(type: string): WebsiteResourceType | undefined {
  return Object.hasOwn(RESOURCE_TYPES, type) ? RESOURCE_TYPES[type] : undefined;
}
