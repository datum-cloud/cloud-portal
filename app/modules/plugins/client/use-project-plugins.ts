/**
 * React Query hook for the project-scoped plugin list — CLIENT-SAFE.
 *
 * Sources the plugins whose nav/cards should appear for a project from the
 * portal server's read API (`GET /api/plugins`), which returns only `Ready`
 * plugins the project is entitled to (dev plugins skip entitlement). Sourced
 * client-side rather than through the project-detail layout loader, whose RBAC
 * DSL envelope is deliberately closed; this keeps the plugin list decoupled
 * from that contract.
 */
import type { PublicPlugin } from '@/modules/plugins/types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export const PLUGINS_API_PATH = '/api/plugins';

export const pluginKeys = {
  all: ['plugins'] as const,
  list: (projectId: string) => ['plugins', 'list', projectId] as const,
};

/**
 * Normalize the read API response into `PublicPlugin[]`. Tolerates a bare array
 * or a `{ data }` / `{ plugins }` envelope so the hook is resilient to the
 * server's exact wrapper (see portal-core's `/api/plugins` handler).
 */
function normalizePluginList(body: unknown): PublicPlugin[] {
  if (Array.isArray(body)) return body as PublicPlugin[];
  if (body && typeof body === 'object') {
    const record = body as { data?: unknown; plugins?: unknown };
    if (Array.isArray(record.data)) return record.data as PublicPlugin[];
    if (Array.isArray(record.plugins)) return record.plugins as PublicPlugin[];
  }
  return [];
}

async function fetchProjectPlugins(projectId: string): Promise<PublicPlugin[]> {
  const url = `${PLUGINS_API_PATH}?projectId=${encodeURIComponent(projectId)}`;
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Failed to load plugins (${response.status})`);
  }
  return normalizePluginList(await response.json());
}

/**
 * Fetch the plugins available in a project. Plugin discovery is best-effort for
 * the sidebar: a failed fetch resolves to no plugin nav rather than blocking
 * the shell, so callers can treat `data ?? []` as safe.
 */
export function useProjectPlugins(
  projectId: string | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<PublicPlugin[]> {
  return useQuery({
    queryKey: pluginKeys.list(projectId ?? ''),
    queryFn: () => fetchProjectPlugins(projectId as string),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 60_000,
    retry: false,
  });
}
