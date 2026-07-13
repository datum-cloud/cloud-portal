/**
 * Data-fetching for the sample plugin.
 *
 * Every API call the plugin issues goes through the portal's existing Milo
 * control-plane proxy at `/api/proxy/…` — including calls to a service's own
 * aggregated apiserver, which is reached the same way as any other Milo
 * resource. There is no plugin-declared backend proxy; a plugin's data must
 * live behind a Milo (or Milo-aggregated) control plane.
 *
 * All hooks use `@tanstack/react-query`, which the host provides as a shared
 * singleton, so plugin queries live in the host's cache alongside built-in
 * pages. Plugins must NOT create their own QueryClient.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

/**
 * Query keys are NAMESPACED under the canonical plugin id. Plugin queries share
 * the host's single QueryCache (flat global key namespace), so prefixing with
 * the service id prevents collisions with host keys or other plugins' keys.
 */
export const PLUGIN_ID = 'sample.miloapis.com';

// ── DNS zones (Milo control plane via /api/proxy) ───────────────────────────

export interface DnsZone {
  name: string;
  domainName?: string;
  ready?: string;
}

interface DnsZoneListItem {
  metadata?: { name?: string };
  spec?: { domainName?: string };
  status?: { conditions?: { type?: string; status?: string }[] };
}

async function fetchDnsZones(projectId: string): Promise<DnsZone[]> {
  // Project-scoped control-plane path, forwarded server-side by /api/proxy with
  // the user's token. Mirrors app/resources/dns-zones/dns-zone.service.ts.
  const base = `/api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectId}/control-plane`;
  const path = `/apis/dns.networking.miloapis.com/v1alpha1/namespaces/default/dnszones`;
  const res = await fetch(`${base}${path}?limit=100`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`DNS zones request failed (${res.status})`);
  }
  const body = (await res.json()) as { items?: DnsZoneListItem[] };
  return (body.items ?? []).map((z) => ({
    name: z.metadata?.name ?? '(unnamed)',
    domainName: z.spec?.domainName,
    ready: z.status?.conditions?.find((c) => c.type === 'Ready')?.status,
  }));
}

export function useDnsZones(projectId: string | undefined): UseQueryResult<DnsZone[]> {
  return useQuery({
    queryKey: [PLUGIN_ID, 'dns-zones', projectId],
    enabled: !!projectId,
    queryFn: () => fetchDnsZones(projectId as string),
    retry: false, // RBAC/entitlement failures shouldn't retry-storm
  });
}
