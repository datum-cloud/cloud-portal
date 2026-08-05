import type { TrafficProtectionMode } from './http-proxy.schema';

export type TrafficProtectionTargetRefLike = {
  group?: string;
  kind?: string;
  name?: string;
};

export type TrafficProtectionPolicyLike = {
  metadata?: { name?: string };
  spec?: {
    mode?: string;
    targetRefs?: TrafficProtectionTargetRefLike[];
  };
};

const ATTACHABLE_KINDS = new Set(['Gateway', 'HTTPRoute']);

/** True when a targetRef attaches to the Gateway/HTTPRoute named like the proxy. */
export function targetRefAttachesToProxy(
  ref: TrafficProtectionTargetRefLike | null | undefined,
  proxyName: string
): boolean {
  if (!ref?.name || ref.name !== proxyName) return false;
  if (!ref.kind || !ATTACHABLE_KINDS.has(ref.kind)) return false;
  // CRD requires gateway.networking.k8s.io; treat missing group as attachable
  // for lenient reads of partial objects in tests/UI caches.
  if (ref.group && ref.group !== 'gateway.networking.k8s.io') return false;
  return true;
}

/** True when any targetRef attaches this policy to the proxy's Gateway or HTTPRoute. */
export function policyAttachesToProxy(
  policy: TrafficProtectionPolicyLike | null | undefined,
  proxyName: string
): boolean {
  const refs = policy?.spec?.targetRefs;
  if (!refs?.length) return false;
  return refs.some((ref) => targetRefAttachesToProxy(ref, proxyName));
}

/**
 * Choose one attaching policy for a proxy when several targetRefs match.
 * Prefer metadata.name === proxyName (portal create convention), else stable
 * lexicographic name order. The UI edits only the selected policy.
 */
export function selectPolicyForProxy<T extends TrafficProtectionPolicyLike>(
  policies: T[],
  proxyName: string
): T | undefined {
  const attaching = policies.filter((policy) => policyAttachesToProxy(policy, proxyName));
  if (attaching.length === 0) return undefined;
  const sameName = attaching.find((policy) => policy.metadata?.name === proxyName);
  if (sameName) return sameName;
  return [...attaching].sort((a, b) =>
    (a.metadata?.name ?? '').localeCompare(b.metadata?.name ?? '')
  )[0];
}

/** Proxy names this policy protects via Gateway/HTTPRoute targetRefs. */
export function proxyNamesProtectedByPolicy(
  policy: TrafficProtectionPolicyLike | null | undefined
): string[] {
  const names = new Set<string>();
  for (const ref of policy?.spec?.targetRefs ?? []) {
    if (ref?.name && targetRefAttachesToProxy(ref, ref.name)) {
      names.add(ref.name);
    }
  }
  return [...names];
}

/**
 * Build proxy-name maps from policies using targetRefs attachment.
 * When multiple policies attach to the same proxy, selectPolicyForProxy wins.
 */
export function buildAttachmentMapsFromPolicies<T extends TrafficProtectionPolicyLike>(
  policies: T[],
  getMode: (policy: T) => TrafficProtectionMode | undefined,
  getParanoia: (policy: T) => { blocking?: number; detection?: number } | undefined
): {
  modeByName: Map<string, TrafficProtectionMode>;
  paranoiaByName: Map<string, { blocking?: number; detection?: number }>;
} {
  const proxies = new Set<string>();
  for (const policy of policies) {
    for (const name of proxyNamesProtectedByPolicy(policy)) {
      proxies.add(name);
    }
  }

  const modeByName = new Map<string, TrafficProtectionMode>();
  const paranoiaByName = new Map<string, { blocking?: number; detection?: number }>();

  for (const proxyName of proxies) {
    const selected = selectPolicyForProxy(policies, proxyName);
    if (!selected) continue;
    const mode = getMode(selected);
    if (mode) modeByName.set(proxyName, mode);
    const paranoia = getParanoia(selected);
    if (paranoia) paranoiaByName.set(proxyName, paranoia);
  }

  return { modeByName, paranoiaByName };
}
