/**
 * Data-fetching for the sample plugin — two tiers, both mediated by the portal.
 *
 * 1. The plugin's OWN backend (non-Milo): fetched through the portal's declared
 *    proxy at `/api/plugins/<slug>/proxy/<alias>/…`. The CR declares alias `api`
 *    → http://localhost:7778 with `authorization: UserToken`, so the portal
 *    injects the user's bearer token server-side. The browser only ever calls
 *    the portal origin.
 * 2. Milo control-plane data: fetched through the portal's existing authenticated
 *    proxy at `/api/proxy/…`. No proxy alias needed — this is the common case.
 *
 * All hooks use `@tanstack/react-query`, which the host provides as a shared
 * singleton, so plugin queries live in the host's cache alongside built-in
 * pages. Plugins must NOT create their own QueryClient.
 */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useParams } from 'react-router';

// ── Shared types ────────────────────────────────────────────────────────────
export type InstanceStatus = 'Running' | 'Restarting' | 'Stopped';

export interface Instance {
  id: string;
  name: string;
  status: InstanceStatus;
  region: string;
  specs: { cpu: number; memoryGiB: number; disk: string };
  createdAt: string;
}

/** Backend response envelope: payload + proxy-mediation facts. */
interface Envelope<T> {
  data: T;
  meta: { authorizationForwarded: boolean };
}

// ── Plugin-proxy plumbing ───────────────────────────────────────────────────

/**
 * The plugin's slug === the mount's `:serviceSlug` route param, so we never
 * hardcode it. This is exactly what the SDK's `usePluginProxyFetch(alias)` will
 * do under the hood.
 */
function usePluginSlug(): string {
  const { serviceSlug } = useParams<{ serviceSlug: string }>();
  return serviceSlug ?? 'sample';
}

function useInstancesBase(): string {
  return `/api/plugins/${usePluginSlug()}/proxy/api`;
}

async function fetchEnvelope<T>(url: string, init?: RequestInit): Promise<Envelope<T>> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { error?: string })?.error ?? '';
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`Request failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return (await res.json()) as Envelope<T>;
}

/**
 * Query keys are NAMESPACED under the canonical plugin id. Plugin queries share
 * the host's single QueryCache (flat global key namespace), so prefixing with
 * the service id prevents collisions with host keys or other plugins' keys.
 */
export const PLUGIN_ID = 'sample.miloapis.com';

export const instanceKeys = {
  all: [PLUGIN_ID, 'instances'] as const,
  list: () => [...instanceKeys.all, 'list'] as const,
  detail: (id: string) => [...instanceKeys.all, 'detail', id] as const,
};

// ── Instances (plugin backend via proxy alias `api`) ────────────────────────

export function useInstances(): UseQueryResult<Envelope<{ items: Instance[] }>> {
  const base = useInstancesBase();
  return useQuery({
    queryKey: instanceKeys.list(),
    queryFn: () => fetchEnvelope<{ items: Instance[] }>(`${base}/instances`),
  });
}

export function useInstance(id: string): UseQueryResult<Envelope<Instance>> {
  const base = useInstancesBase();
  return useQuery({
    queryKey: instanceKeys.detail(id),
    queryFn: () => fetchEnvelope<Instance>(`${base}/instances/${id}`),
    // While an instance is Restarting, poll so the UI flips back to Running.
    refetchInterval: (query) => (query.state.data?.data.status === 'Restarting' ? 1000 : false),
  });
}

export function useRestartInstance(id: string) {
  const base = useInstancesBase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchEnvelope<Instance>(`${base}/instances/${id}/restart`, { method: 'POST' }),
    onSuccess: () => {
      // Invalidate against the HOST's shared query client.
      queryClient.invalidateQueries({ queryKey: instanceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: instanceKeys.list() });
    },
  });
}

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
